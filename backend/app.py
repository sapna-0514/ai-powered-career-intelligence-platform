import os 
import json
import re
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path

import joblib
from dotenv import load_dotenv
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from supabase import create_client

from resume_parser import extract_text, parse_resume

load_dotenv()

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024   # 5 MB upload limit
# Lets the frontend (Live Server, port 5500) call this API (port 5000)
CORS(app, origins=["http://127.0.0.1:5500", "http://localhost:5500"])

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")


@app.errorhandler(413)
def too_large(e):
    return jsonify(error="File is too large. The limit is 5 MB."), 413


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


# ---------- Career model ----------
MODEL_PATH = Path(__file__).parent / "models" / "baseline_tfidf.joblib"
_model = None


def get_model():
    """Loads the trained model once. Returns None if it is missing or old-format."""
    global _model
    if _model is None and MODEL_PATH.exists():
        loaded = joblib.load(MODEL_PATH)
        if hasattr(loaded, "predict_proba"):
            _model = loaded
    return _model


def pretty(name):
    return name.replace("-", " ").title()


def profile_text(p):
    """Turns a saved profile into text for the model (the target career is left out)."""
    parts = [
        p.get("field_of_study"),
        p.get("education"),
        " ".join(p.get("skills") or []),
        " ".join(p.get("certifications") or []),
        p.get("summary"),
    ]
    return ". ".join(x for x in parts if x)


def predict_careers(profile, top_n=5):
    model = get_model()
    if model is None or not profile or not profile.get("skills"):
        return None
    proba = model.predict_proba([profile_text(profile)])[0]
    top = proba.argsort()[::-1][:top_n]
    return [{"name": pretty(model.classes_[i]),
             "confidence": round(float(proba[i]) * 100, 1)} for i in top]


def load_profile(user):
    res = (user_client().table("profiles")
           .select("*").eq("user_id", user.id).execute())
    return res.data[0] if res.data else None



# ---------- Resume analysis helpers ----------
CAREER_SKILLS_PATH = Path(__file__).parent / "models" / "career_skills.json"
_career_skills = None


def get_career_skills():
    global _career_skills
    if _career_skills is None:
        _career_skills = (json.loads(CAREER_SKILLS_PATH.read_text(encoding="utf-8"))
                          if CAREER_SKILLS_PATH.exists() else {})
    return _career_skills


def strip_title(text):
    """Removes the leading ALL-CAPS job title (the model was trained without it)."""
    words = str(text).split()
    i = 0
    while i < len(words) and (words[i].isupper() or words[i] in {"&", "/", "-", "|"}):
        i += 1
    return " ".join(words[i:]) if i < len(words) else " ".join(words)


def skill_gap(key, user_skills):
    """Compares the user's skills with the typical skills of one career."""
    prof = get_career_skills().get(key)
    if not prof or not prof["skills"]:
        return {"has_data": False, "have": [], "missing": [], "alignment": None}
    have_set = {s.lower() for s in user_skills}
    have, missing, total, got = [], [], 0.0, 0.0
    for skill, share in prof["skills"]:
        total += share
        if skill.lower() in have_set:
            have.append(skill)
            got += share
        else:
            missing.append({"skill": skill, "share": round(share * 100)})
    return {"has_data": True, "have": have, "missing": missing,
            "alignment": round(got / total * 100)}


def resume_tips(text, parsed):
    """Simple rule-based advice. These are heuristics, not model output."""
    tips = []
    words = len(text.split())
    if words < 250:
        tips.append(f"Your resume is short ({words} words). Add more detail on projects and results.")
    if words > 1200:
        tips.append(f"Your resume is long ({words} words). Aim for one or two pages.")
    if len(parsed["skills"]) < 8:
        tips.append("Few skills were detected. List your technical skills clearly in a Skills section.")
    if not parsed["education"]:
        tips.append("No degree was detected. State your degree and field of study.")
    if not parsed["certifications"]:
        tips.append("No certifications were detected. Add relevant courses or certificates.")
    if not re.search(r"\d+\s*%|\d+\s*\+", text):
        tips.append("Add measurable results, such as percentages or counts, to your project descriptions.")
    return tips

# ---------- Auth ----------
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


# ---------- Profile ----------
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


# ---------- Resume upload ----------
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


# ---------- Career prediction ----------
@app.get("/api/predict")
@token_required
def predict(user):
    if get_model() is None:
        return jsonify(error="The model is not available yet. Run train_baseline_tuned.py."), 503
    try:
        profile = load_profile(user)
    except Exception as e:
        print("Predict profile error:", e)
        return jsonify(error="Could not load your profile."), 500
    if not profile or not profile.get("skills"):
        return jsonify(error="Add your skills on My Profile first."), 400
    return jsonify(careers=predict_careers(profile))


@app.post("/api/resume/analyze")
@token_required
def analyze_resume(user):
    model = get_model()
    if model is None:
        return jsonify(error="The model is not available yet. Run train_baseline_tuned.py."), 503

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

    parsed = parse_resume(text)
    proba = model.predict_proba([strip_title(text)])[0]
    careers, gaps = [], {}
    for i in proba.argsort()[::-1][:5]:
        key = str(model.classes_[i])
        careers.append({"key": key, "name": pretty(key),
                        "confidence": round(float(proba[i]) * 100, 1)})
        gaps[key] = skill_gap(key, parsed["skills"])

    return jsonify(parsed=parsed, careers=careers, gaps=gaps,
                   tips=resume_tips(text, parsed))
# ---------- Dashboard ----------
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

    careers = predict_careers(profile) if profile else None
    if careers:
        paths = [{"name": c["name"], "match": c["confidence"]} for c in careers[:3]]
        score = round(careers[0]["confidence"])
    else:
        # No profile or no model yet: placeholders
        paths = [
            {"name": "Software Developer", "match": 92},
            {"name": "Data Analyst", "match": 88},
            {"name": "Cloud Engineer", "match": 80},
        ]
        score = 85

    return jsonify(
        user={
            "email": user.email,
            "name": (user.user_metadata or {}).get("full_name", "there"),
        },
        has_profile=profile is not None,
        score=score,
        skills=skills,
        skills_change="From your profile",
        certs=certs,
        certs_change="From your profile",
        paths=paths,
        drive={"company": "Infosys", "role": "Software Developer"},
    )


if __name__ == "__main__":
    app.run(debug=True, port=5000)