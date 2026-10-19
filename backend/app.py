import os
from datetime import datetime, timezone
from functools import wraps
from dotenv import load_dotenv
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from supabase import create_client 
from resume_parser import extract_text, parse_resume

load_dotenv()

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024   # 5 MB upload limit


@app.errorhandler(413)
def too_large(e):
    return jsonify(error="File is too large. The limit is 5 MB."), 413
# Lets the frontend (Live Server, port 5500) call this API (port 5000)
CORS(app, origins=["http://127.0.0.1:5500", "http://localhost:5500"])

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")


def get_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def user_client():
    """Supabase client that acts as the logged-in user (so RLS applies)."""
    client = get_client()
    client.postgrest.auth(g.token)
    return client


def token_required(view):
    """Protects a route: checks the 'Authorization: Bearer <token>' header."""
    @wraps(view)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify(error="Missing token"), 401
        token = header.split(" ", 1)[1]
        try:
            res = get_client().auth.get_user(token)
            if not res or not res.user:
                return jsonify(error="Invalid token"), 401
        except Exception:
            return jsonify(error="Invalid or expired token"), 401
        g.token = token
        return view(res.user, *args, **kwargs)
    return wrapper


def clean_list(value, limit=50):
    """Turns 'a, b, c' or ['a','b'] into a clean list without duplicates."""
    if isinstance(value, str):
        value = value.split(",")
    out, seen = [], set()
    for item in value or []:
        s = str(item).strip()
        if s and s.lower() not in seen:
            seen.add(s.lower())
            out.append(s[:60])
    return out[:limit]


def load_profile(user):
    res = (user_client().table("profiles")
           .select("*").eq("user_id", user.id).execute())
    return res.data[0] if res.data else None


@app.post("/api/signup")
def signup():
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not name or not email or len(password) < 6:
        return jsonify(error="Name, email and a 6+ character password are required."), 400
    try:
        res = get_client().auth.sign_up({
            "email": email,
            "password": password,
            "options": {"data": {"full_name": name}},
        })
        if not res.user:
            return jsonify(error="Sign-up failed."), 400
        return jsonify(message="Account created. Please sign in."), 201
    except Exception as e:
        return jsonify(error=str(e)), 400


@app.post("/api/login")
def login():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    try:
        res = get_client().auth.sign_in_with_password(
            {"email": email, "password": password}
        )
        return jsonify(
            access_token=res.session.access_token,
            user={
                "email": res.user.email,
                "name": (res.user.user_metadata or {}).get("full_name", "there"),
            },
        )
    except Exception:
        return jsonify(error="Email or password is incorrect."), 401


@app.get("/api/me")
@token_required
def me(user):
    return jsonify(
        email=user.email,
        name=(user.user_metadata or {}).get("full_name", "there"),
    )


@app.get("/api/profile")
@token_required
def get_profile(user):
    try:
        return jsonify(profile=load_profile(user))
    except Exception as e:
        print("Profile load error:", e)
        return jsonify(error="Could not load your profile."), 500


@app.put("/api/profile")
@token_required
def save_profile(user):
    body = request.get_json(silent=True) or {}

    try:
        years = max(0, min(60, int(body.get("experience_years") or 0)))
    except (TypeError, ValueError):
        return jsonify(error="Experience must be a number of years."), 400

    skills = clean_list(body.get("skills"))
    if not skills:
        return jsonify(error="Add at least one skill."), 400

    row = {
        "user_id": user.id,
        "target_role": (body.get("target_role") or "").strip()[:100],
        "education": (body.get("education") or "").strip()[:100],
        "field_of_study": (body.get("field_of_study") or "").strip()[:100],
        "experience_years": years,
        "skills": skills,
        "certifications": clean_list(body.get("certifications")),
        "summary": (body.get("summary") or "").strip()[:1000],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        res = (user_client().table("profiles")
               .upsert(row, on_conflict="user_id").execute())
        return jsonify(message="Profile saved.", profile=res.data[0])
    except Exception as e:
        print("Profile save error:", e)
        return jsonify(error="Could not save your profile."), 500

@app.post("/api/resume/parse")
@token_required
def parse_resume_route(user):
    f = request.files.get("resume")
    if not f or not f.filename:
        return jsonify(error="Choose a resume file first."), 400

    ext = f.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("pdf", "docx"):
        return jsonify(error="Only PDF and DOCX files are supported."), 400

    try:
        text = extract_text(f, ext)
    except Exception as e:
        print("Resume read error:", e)
        return jsonify(error="Could not read this file. Try another copy."), 400

    if len(text.strip()) < 50:
        return jsonify(error="No readable text found. Scanned resumes are not supported yet."), 400

    return jsonify(parsed=parse_resume(text))


@app.get("/api/dashboard")
@token_required
def dashboard(user):
    try:
        profile = load_profile(user)
    except Exception as e:
        print("Dashboard profile error:", e)
        profile = None

    skills = len(profile["skills"] or []) if profile else 0
    certs = len(profile["certifications"] or []) if profile else 0

    # Score, paths and drive are still placeholders. The ML model replaces them later.
    return jsonify(
        user={
            "email": user.email,
            "name": (user.user_metadata or {}).get("full_name", "there"),
        },
        has_profile=profile is not None,
        score=85,
        skills=skills,
        skills_change="From your profile",
        certs=certs,
        certs_change="From your profile",
        paths=[
            {"name": "Software Developer", "match": 92},
            {"name": "Data Analyst", "match": 88},
            {"name": "Cloud Engineer", "match": 80},
        ],
        drive={"company": "Infosys", "role": "Software Developer"},
    )


if __name__ == "__main__":
    app.run(debug=True, port=5000)