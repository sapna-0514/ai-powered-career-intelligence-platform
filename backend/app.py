import os
from functools import wraps
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client

load_dotenv()

app = Flask(__name__)
# Lets the frontend (Live Server, port 5500) call this API (port 5000)
CORS(app, origins=["http://127.0.0.1:5500", "http://localhost:5500"])

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")


def get_client():
    return create_client(SUPABASE_URL, SUPABASE_KEY)


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
        return view(res.user, *args, **kwargs)
    return wrapper


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


@app.get("/api/dashboard")
@token_required
def dashboard(user):
    # Placeholder data. Later this comes from the ML model and database.
    return jsonify(
        user={
            "email": user.email,
            "name": (user.user_metadata or {}).get("full_name", "there"),
        },
        score=85,
        skills=24,
        skills_change="+12% this month",
        certs=6,
        certs_change="+20% this month",
        paths=[
            {"name": "Software Developer", "match": 92},
            {"name": "Data Analyst", "match": 88},
            {"name": "Cloud Engineer", "match": 80},
        ],
        drive={"company": "Infosys", "role": "Software Developer"},
    )
    
    
if __name__ == "__main__":
    app.run(debug=True, port=5000)