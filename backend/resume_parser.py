import re
import spacy
from spacy.matcher import PhraseMatcher
from pypdf import PdfReader
from docx import Document
from skills import SKILLS

nlp = spacy.load("en_core_web_sm")

# One matcher that knows every skill and its alternative spellings
matcher = PhraseMatcher(nlp.vocab, attr="LOWER")
for canonical, aliases in SKILLS.items():
    matcher.add(canonical, [nlp.make_doc(name) for name in [canonical] + aliases])

DEGREES = [  # highest first
    ("PhD", r"\b(ph\.?d|doctorate)\b"),
    ("Master's degree", r"\b(m\.?tech|m\.?sc|mba|mca|masters?|master's|m\.s\.|m\.e\.)"),
    ("Bachelor's degree", r"\b(b\.?tech|b\.?sc|bca|b\.?com|bachelors?|bachelor's|b\.e\.|b\.a\.|b\.s\.)"),
    ("Diploma", r"\bdiploma\b"),
]

FIELDS = [
    "computer science", "information technology", "data science",
    "artificial intelligence", "electronics", "electrical", "mechanical",
    "civil", "business administration", "statistics", "mathematics",
    "physics", "commerce",
]


def extract_text(file_storage, ext):
    """Reads plain text out of an uploaded PDF or DOCX."""
    if ext == "pdf":
        reader = PdfReader(file_storage.stream)
        return "\n".join((page.extract_text() or "") for page in reader.pages)
    doc = Document(file_storage.stream)
    parts = [p.text for p in doc.paragraphs]
    for table in doc.tables:
        for row in table.rows:
            parts.extend(cell.text for cell in row.cells)
    return "\n".join(parts)


def find_skills(text):
    doc = nlp(text)
    found = {}
    for match_id, start, end in matcher(doc):
        name = nlp.vocab.strings[match_id]
        found.setdefault(name, start)       # remember first position
    return sorted(found, key=found.get)     # keep the resume's own order


def find_education(text):
    lower = text.lower()
    for label, pattern in DEGREES:
        if re.search(pattern, lower):
            return label
    return ""


def find_field(text):
    lower = text.lower()
    for field in FIELDS:
        if field in lower:
            return field.title()
    return ""


def find_experience_years(text):
    nums = re.findall(
        r"(\d{1,2})\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:\w+\s+)?experience",
        text.lower(),
    )
    return max((int(n) for n in nums), default=0)


def find_certifications(text):
    certs = []
    for line in text.splitlines():
        line = line.strip(" \t•-–*·")
        if 5 < len(line) <= 80 and re.search(r"certif", line, re.I):
            if line not in certs:
                certs.append(line)
    return certs[:10]


def parse_resume(text):
    return {
        "skills": find_skills(text),
        "education": find_education(text),
        "field_of_study": find_field(text),
        "experience_years": find_experience_years(text),
        "certifications": find_certifications(text),
    }