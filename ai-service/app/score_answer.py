import hmac
import os
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer, util

router = APIRouter(prefix="/ai", tags=["interview"])

MODEL_NAME = os.getenv("SEMANTIC_MODEL", "all-MiniLM-L6-v2")
_model = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)
    return _model


class ScoreAnswerRequest(BaseModel):
    answer: str = Field(..., max_length=6000)
    reference: str = Field(..., max_length=6000)


def verify_key(key: Optional[str]) -> None:
    expected = os.getenv("AI_SERVICE_SECRET")
    if not expected or not key or not hmac.compare_digest(key, expected):
        raise HTTPException(status_code=401, detail="Invalid internal API key")


@router.post("/score-answer")
def score_answer(
    body: ScoreAnswerRequest,
    x_internal_api_key: Optional[str] = Header(default=None),
):
    verify_key(x_internal_api_key)
    answer = body.answer.strip()
    reference = body.reference.strip()
    if not answer or not reference:
        return {"similarity": 0.0, "model": MODEL_NAME}
    try:
        model = get_model()
        emb = model.encode([answer, reference], convert_to_tensor=True, normalize_embeddings=True)
        sim = float(util.cos_sim(emb[0], emb[1]).item())
    except Exception as e:
        print("score-answer error:", e)
        raise HTTPException(status_code=503, detail="Semantic model unavailable")
    return {"similarity": round(sim, 4), "model": MODEL_NAME}