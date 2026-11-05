import re
from pathlib import Path
from collections import OrderedDict

import fitz
import docx
import spacy

# Load once when the service starts. Install en_core_web_sm in the active venv.
nlp = spacy.load("en_core_web_sm")

SKILL_TAXONOMY = {
    "Programming Languages": {
        "Java": ["java", "core java"], "JavaScript": ["javascript", "js"],
        "Python": ["python"], "C": ["c programming"], "C++": ["c++", "cpp"],
        "SQL": ["sql"], "TypeScript": ["typescript"]
    },
    "Frontend": {
        "HTML": ["html", "html5"], "CSS": ["css", "css3"],
        "React": ["react", "reactjs"], "Tailwind CSS": ["tailwind css", "tailwind"],
        "Bootstrap": ["bootstrap"], "Angular": ["angular"], "Vue.js": ["vue.js", "vue"]
    },
    "Backend & APIs": {
        "Node.js": ["node.js", "nodejs"], "Express.js": ["express.js", "express"],
        "REST API": ["rest api", "restful api"], "FastAPI": ["fastapi"],
        "Django": ["django"], "Flask": ["flask"], "Spring Boot": ["spring boot"]
    },
    "Databases": {
        "MongoDB": ["mongodb", "mongo db"], "MySQL": ["mysql", "my sql"],
        "PostgreSQL": ["postgresql", "postgres"], "Redis": ["redis"]
    },
    "Tools & Cloud": {
        "Git": ["github", "git"], "Docker": ["docker"], "AWS": ["amazon web services", "aws"],
        "Azure": ["microsoft azure", "azure"], "Linux": ["linux"],
        "Postman": ["postman"], "Power BI": ["power bi"], "Tableau": ["tableau"]
    },
    "AI & Data": {
        "Machine Learning": ["machine learning"], "Artificial Intelligence": ["artificial intelligence"],
        "Deep Learning": ["deep learning"], "Data Analysis": ["data analysis"],
        "Pandas": ["pandas"], "NumPy": ["numpy"], "Scikit-learn": ["scikit-learn", "sklearn"],
        "TensorFlow": ["tensorflow"], "PyTorch": ["pytorch"]
    },
    "Core CS": {
        "DSA": ["data structures and algorithms", "dsa"],
        "OOP": ["object oriented programming", "oops"],
        "DBMS": ["database management system", "dbms"],
        "Operating Systems": ["operating systems", "operating system"],
        "Computer Networks": ["computer networks", "computer network"]
    }
}

SOFT_SKILLS = [
    "Communication", "Teamwork", "Leadership", "Problem Solving",
    "Adaptability", "Time Management", "Critical Thinking",
    "Analytical Thinking", "Collaboration", "Creativity"
]
SOFT_PATTERNS = {
    "Communication": ["communication", "communicated"],
    "Teamwork": ["teamwork", "team player"],
    "Leadership": ["leadership", "led a team"],
    "Problem Solving": ["problem solving", "problem-solving"],
    "Adaptability": ["adaptability", "adaptable"],
    "Time Management": ["time management"],
    "Critical Thinking": ["critical thinking"],
    "Analytical Thinking": ["analytical thinking", "analytical skills"],
    "Collaboration": ["collaboration", "collaborated"],
    "Creativity": ["creative thinking", "creativity"]
}


def extract_pdf_text(file_path):
    chunks = []
    with fitz.open(file_path) as document:
        for page in document:
            chunks.append(page.get_text("text"))
    return "\n".join(chunks).strip()


def extract_docx_text(file_path):
    document = docx.Document(file_path)
    chunks = [p.text for p in document.paragraphs if p.text.strip()]
    for table in document.tables:
        for row in table.rows:
            value = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
            if value:
                chunks.append(value)
    return "\n".join(chunks).strip()


def extract_txt_text(file_path):
    return Path(file_path).read_text(encoding="utf-8-sig", errors="replace").strip()


def extract_resume_text(file_path):
    extension = Path(file_path).suffix.lower()
    if extension == ".pdf":
        return extract_pdf_text(file_path)
    if extension == ".docx":
        return extract_docx_text(file_path)
    if extension == ".txt":
        return extract_txt_text(file_path)
    raise ValueError("Unsupported file format. Use PDF, DOCX or TXT.")


def _contains(text, phrase):
    phrase = phrase.lower().strip()
    if not phrase:
        return False
    pattern = r"(?<![a-z0-9+#])" + re.escape(phrase) + r"(?![a-z0-9+#])"
    return bool(re.search(pattern, text.lower()))


def extract_skills(text):
    found = OrderedDict()
    for category, skills in SKILL_TAXONOMY.items():
        for canonical, synonyms in skills.items():
            if any(_contains(text, synonym) for synonym in synonyms):
                found[canonical] = category
    return sorted(found.keys()), {
        category: sorted(skill for skill, group in found.items() if group == category)
        for category in SKILL_TAXONOMY
        if any(group == category for group in found.values())
    }


def extract_soft_skills(text):
    found = []
    for skill, patterns in SOFT_PATTERNS.items():
        if any(_contains(text, pattern) for pattern in patterns):
            found.append(skill)
    return found


def extract_personal_info(text):
    lines = [line.strip(" |•\t") for line in text.splitlines() if line.strip()]
    email_match = re.search(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", text, re.I)
    phone_match = re.search(r"(?<!\w)(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3,5}\)?[\s.-]?)?\d{5,10}(?!\w)", text)
    linkedin_match = re.search(r"(?:https?://)?(?:www\.)?linkedin\.com/in/[A-Za-z0-9_%/-]+", text, re.I)
    website_match = re.search(r"https?://(?:www\.)?(?!linkedin\.com)[A-Za-z0-9.-]+\.[A-Za-z]{2,}[^\s,)]*", text, re.I)

    name = None
    for line in lines[:8]:
        if len(line) < 65 and not re.search(r"@|https?://|\d{4,}|resume|curriculum vitae", line, re.I):
            words = re.findall(r"[A-Za-z][A-Za-z.'-]*", line)
            if 2 <= len(words) <= 4 and all(len(word) > 1 for word in words):
                name = line
                break

    location = None
    for line in lines[:15]:
        if re.search(r"\b(location|address|based in)\b", line, re.I):
            location = re.sub(r"(?i)^(location|address|based in)\s*[:\-]?\s*", "", line)
            break

    return {
        "name": name,
        "email": email_match.group(0) if email_match else None,
        "phone": phone_match.group(0).strip() if phone_match else None,
        "location": location,
        "linkedin": ("https://" + linkedin_match.group(0).lstrip("/")) if linkedin_match and not linkedin_match.group(0).startswith("http") else (linkedin_match.group(0) if linkedin_match else None),
        "website": website_match.group(0) if website_match else None
    }


def extract_entities(text):
    doc = nlp(text[:100000])
    output = []
    seen = set()
    for ent in doc.ents:
        if ent.label_ in {"PERSON", "ORG", "GPE", "DATE"}:
            key = (ent.text.strip(), ent.label_)
            if key not in seen:
                seen.add(key)
                output.append({"text": ent.text.strip(), "label": ent.label_})
    return output[:100]


def extract_education(text):
    keywords = ("b.tech", "bachelor", "master", "m.tech", "mca", "bca", "b.sc",
                "m.sc", "degree", "education", "university", "college", "diploma",
                "ssc", "intermediate", "higher secondary", "school")
    lines = []
    for line in text.splitlines():
        clean = re.sub(r"\s+", " ", line).strip(" •|\t")
        if clean and any(k in clean.lower() for k in keywords):
            if clean not in lines:
                lines.append(clean)
    return lines[:30]


def extract_experience(text):
    lines = [re.sub(r"\s+", " ", line).strip(" •|\t") for line in text.splitlines()]
    keywords = ("experience", "intern", "developer", "engineer", "employment",
                "worked as", "professional experience", "work history")
    selected = []
    for line in lines:
        if line and any(k in line.lower() for k in keywords) and line not in selected:
            selected.append(line)
    return selected[:40]


def extract_projects(text):
    lines = [re.sub(r"\s+", " ", line).strip(" •|\t") for line in text.splitlines()]
    in_projects = False
    results = []
    for line in lines:
        low = line.lower().strip(" :")
        if re.match(r"^(projects?|academic projects?|personal projects?)$", low):
            in_projects = True
            continue
        if re.match(r"^(education|experience|work experience|certifications?|skills|technical skills)$", low):
            in_projects = False
        if in_projects and line:
            results.append(line)
    return list(dict.fromkeys(results))[:30]


def extract_certifications(text):
    lines = []
    terms = ("certification", "certified", "certificate", "nptel", "coursera",
             "udemy", "linkedin learning", "aws academy")
    for line in text.splitlines():
        clean = re.sub(r"\s+", " ", line).strip(" •|\t")
        if clean and any(term in clean.lower() for term in terms):
            if clean not in lines:
                lines.append(clean)
    return lines[:25]


def _summary(personal, skills, education, experience):
    name = personal.get("name")
    skill_text = ", ".join(skills[:7])
    edu_text = education[0] if education else None
    exp_count = len(experience)
    parts = []
    if name:
        parts.append(f"{name} is a candidate")
    else:
        parts.append("The candidate")
    if edu_text:
        parts.append(f"with an education background that includes {edu_text}")
    if skill_text:
        parts.append(f"and skills including {skill_text}")
    if exp_count:
        parts.append(f"The resume contains {exp_count} experience-related entries")
    return ". ".join(parts).rstrip(".") + "."


def build_insights(text, personal, skills, education, experience, projects, certifications, skill_categories, soft_skills):
    sections = [
        ("Contact information", bool(personal.get("email") or personal.get("phone")), 10),
        ("Professional summary", bool(re.search(r"\b(summary|profile|objective)\b", text, re.I)), 10),
        ("Skills", bool(skills or soft_skills), 20),
        ("Education", bool(education), 15),
        ("Work experience", bool(experience), 20),
        ("Projects", bool(projects), 10),
        ("Certifications", bool(certifications), 5),
        ("Measurable achievements", bool(re.search(r"\b(\d+%|\d+\+|increased|reduced|improved|achieved|delivered)\b", text, re.I)), 10)
    ]
    breakdown = [{"label": label, "score": points if present else 0, "maxScore": points} for label, present, points in sections]
    score = sum(item["score"] for item in breakdown)
    strengths = []
    if skills:
        strengths.append(f"Identified {len(skills)} technical skills across {len(skill_categories)} skill categories.")
    if education:
        strengths.append("Education-related information was found.")
    if experience:
        strengths.append(f"Found {len(experience)} experience-related lines to review.")
    if projects:
        strengths.append("A projects section appears to be present.")
    suggestions = []
    if not personal.get("email") or not personal.get("phone"):
        suggestions.append("Make sure your current email address and phone number are easy to find.")
    if not re.search(r"\b(summary|profile|objective)\b", text, re.I):
        suggestions.append("Add a short professional summary tailored to the roles you are targeting.")
    if not skills:
        suggestions.append("Add a clearly labelled Skills section with relevant technical skills.")
    if not education:
        suggestions.append("Add your degree, institution and graduation year.")
    if not experience:
        suggestions.append("Add internships, employment or practical experience with dates and responsibilities.")
    if not projects:
        suggestions.append("Include 2–3 relevant projects and describe your contribution and technologies used.")
    if not certifications:
        suggestions.append("Add relevant certifications or training, if you have them.")
    if not re.search(r"\b(\d+%|\d+\+|increased|reduced|improved|achieved|delivered)\b", text, re.I):
        suggestions.append("Where possible, quantify project and work outcomes with numbers or measurable results.")
    return {
        "resumeScore": score,
        "scoreBreakdown": breakdown,
        "strengths": strengths,
        "suggestions": suggestions,
        "metrics": {
            "skillsFound": len(skills) + len(soft_skills),
            "experienceEntries": len(experience),
            "educationEntries": len(education)
        }
    }


def analyze_resume(file_path):
    text = extract_resume_text(file_path)
    if not text.strip():
        raise ValueError("No readable text was found. This may be a scanned/image-only PDF; OCR is not enabled.")
    skills, skill_categories = extract_skills(text)
    soft_skills = extract_soft_skills(text)
    if soft_skills:
        skill_categories["Soft Skills"] = soft_skills
    personal = extract_personal_info(text)
    education = extract_education(text)
    experience = extract_experience(text)
    projects = extract_projects(text)
    certifications = extract_certifications(text)
    entities = extract_entities(text)
    insights = build_insights(text, personal, skills, education, experience, projects,
                               certifications, skill_categories, soft_skills)
    return {
        "extractedText": text,
        "parsedData": {
            "personalInfo": personal,
            "professionalSummary": _summary(personal, skills, education, experience),
            "skills": skills,
            "skillCategories": skill_categories,
            "softSkills": soft_skills,
            "education": education,
            "experience": experience,
            "projects": projects,
            "certifications": certifications,
            "entities": entities,
            "insights": insights
        }
    }
