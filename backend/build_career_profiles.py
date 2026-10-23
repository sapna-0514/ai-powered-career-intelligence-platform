import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path

import pandas as pd

from resume_parser import parse_resume

BASE = Path(__file__).parent
DATA = BASE / "data"
MODELS = BASE / "models"
MODELS.mkdir(exist_ok=True)

train = pd.read_csv(DATA / "train.csv")
cache_file = DATA / "skills_cache.json"
cache = json.loads(cache_file.read_text()) if cache_file.exists() else {}

per_category = defaultdict(list)
new = 0
for text, label in zip(train["text"], train["label"]):
    text = str(text)
    key = hashlib.md5(text.encode("utf-8")).hexdigest()
    if key not in cache:                      # reuses skills found in Step 6
        cache[key] = parse_resume(text)["skills"]
        new += 1
        if new % 250 == 0:
            print(f"  parsed {new} resumes...")
    per_category[label].append(cache[key])
cache_file.write_text(json.dumps(cache))

# For each career: the skills that appear in at least 10% of its resumes
profiles = {}
for label, lists in sorted(per_category.items()):
    n = len(lists)
    counts = Counter(s for skills in lists for s in set(skills))
    top = [[s, round(c / n, 3)] for s, c in counts.most_common(12) if c / n >= 0.10]
    profiles[label] = {"resumes": n, "skills": top}
    preview = ", ".join(f"{s} {int(p * 100)}%" for s, p in top[:5]) or "(no skills found)"
    print(f"{label:24} {n:4} resumes   {preview}")

(MODELS / "career_skills.json").write_text(json.dumps(profiles, indent=2))
print("\nSaved", MODELS / "career_skills.json")