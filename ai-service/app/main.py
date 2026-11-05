from dotenv import load_dotenv
load_dotenv()

from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from app.security import verify_internal_key
from app.services.resume_parser import analyze_resume

MAX_FILE_SIZE = 5 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}

app = FastAPI(
    title="CareerCast AI Service",
    description="Resume text extraction and rule-assisted resume insights",
    version="1.1.0"
)


@app.get("/")
def home():
    return {"message": "CareerCast AI Service is running!"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/ai/parse-resume", dependencies=[Depends(verify_internal_key)])
async def parse_resume(file: UploadFile = File(...)):
    extension = Path(file.filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only PDF, DOCX and TXT files are supported")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Maximum file size is 5 MB")

    temp_path = None
    try:
        with NamedTemporaryFile(suffix=extension, delete=False) as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name
        result = analyze_resume(temp_path)
        return {"success": True, "message": "Resume analyzed successfully", **result}
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error))
    except Exception as error:
        # Details remain in the AI service console; do not expose internal paths to clients.
        print(f"Resume processing error: {type(error).__name__}: {error}")
        raise HTTPException(status_code=500, detail="Resume processing failed. Check the AI service logs.")
    finally:
        if temp_path and Path(temp_path).exists():
            Path(temp_path).unlink()
        await file.close()
