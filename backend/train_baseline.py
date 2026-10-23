import hashlib
import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (classification_report, f1_score,
                             top_k_accuracy_score)
from sklearn.preprocessing import MultiLabelBinarizer

from resume_parser import parse_resume
from skills import SKILLS

BASE = Path(__file__).parent
DATA = BASE / "data"
MODELS = BASE / "models"
MODELS.mkdir(exist_ok=True)

# None keeps all 24 categories. To try a tech-focused subset, use for example:
# ["INFORMATION-TECHNOLOGY", "ENGINEERING", "DESIGNER", "DIGITAL-MEDIA", "BUSINESS-DEVELOPMENT"]
KEEP_CATEGORIES = None

# Many resumes start with a job title that gives the answer away.
# If the first words of your resumes look like that (see the preview below),
# set this to about 6 and compare the accuracy.
DROP_FIRST_WORDS = 0

train = pd.read_csv(DATA / "train.csv")
val = pd.read_csv(DATA / "val.csv")
if KEEP_CATEGORIES:
    train = train[train["label"].isin(KEEP_CATEGORIES)]
    val = val[val["label"].isin(KEEP_CATEGORIES)]


def prep(text):
    words = str(text).split()
    return " ".join(words[DROP_FIRST_WORDS:])


train["text"] = train["text"].map(prep)
val["text"] = val["text"].map(prep)

print("Preview of how resumes start (check for job titles):")
for t in train["text"].head(3):
    print("  ", t[:120])
print(f"\nTrain: {len(train)}   Validation: {len(val)}   "
      f"Categories: {train['label'].nunique()}")

y_train, y_val = train["label"], val["label"]


def evaluate(name, X_train, X_val):
    clf = LogisticRegression(max_iter=2000)
    clf.fit(X_train, y_train)
    proba = clf.predict_proba(X_val)
    pred = clf.classes_[proba.argmax(axis=1)]
    res = {
        "top1": (pred == y_val.values).mean(),
        "top3": top_k_accuracy_score(y_val, proba, k=3, labels=clf.classes_),
        "top5": top_k_accuracy_score(y_val, proba, k=5, labels=clf.classes_),
        "f1": f1_score(y_val, pred, average="macro"),
    }
    print(f"\n==== {name} ====")
    print(f"Top-1 accuracy : {res['top1']:.1%}   (target 65%)")
    print(f"Top-3 accuracy : {res['top3']:.1%}")
    print(f"Top-5 accuracy : {res['top5']:.1%}")
    print(f"Macro F1       : {res['f1']:.3f}")
    report = classification_report(y_val, pred, zero_division=0)
    return clf, report


# ---- A. TF-IDF on the full resume text ----
tfidf = TfidfVectorizer(max_features=20000, ngram_range=(1, 2),
                        min_df=2, sublinear_tf=True, stop_words="english")
Xa_train = tfidf.fit_transform(train["text"])
Xa_val = tfidf.transform(val["text"])
clf_a, report_a = evaluate("A. TF-IDF text", Xa_train, Xa_val)
joblib.dump({"model": clf_a, "vectorizer": tfidf}, MODELS / "baseline_tfidf.joblib")
(MODELS / "report_tfidf.txt").write_text(report_a, encoding="utf-8")

# ---- B. Skills extracted by the parser (same input as the profile form) ----
cache_file = DATA / "skills_cache.json"
cache = json.loads(cache_file.read_text()) if cache_file.exists() else {}


def skills_for(texts):
    out, new = [], 0
    for i, text in enumerate(texts, 1):
        key = hashlib.md5(text.encode("utf-8")).hexdigest()
        if key not in cache:
            cache[key] = parse_resume(text)["skills"]
            new += 1
            if new % 250 == 0:
                print(f"  parsed {new} resumes...")
        out.append(cache[key])
    return out


print("\nExtracting skills with the parser (slow the first time)...")
sk_train = skills_for(train["text"].tolist())
sk_val = skills_for(val["text"].tolist())
cache_file.write_text(json.dumps(cache))

mlb = MultiLabelBinarizer(classes=list(SKILLS))
Xb_train = mlb.fit_transform(sk_train)
Xb_val = mlb.transform(sk_val)

coverage = sum(1 for s in sk_val if s) / len(sk_val)
print(f"Coverage: parser found at least one skill in {coverage:.1%} of validation resumes")

clf_b, report_b = evaluate("B. Parser skills", Xb_train, Xb_val)
joblib.dump({"model": clf_b, "binarizer": mlb}, MODELS / "baseline_skills.joblib")
(MODELS / "report_skills.txt").write_text(report_b, encoding="utf-8")

print("\nSaved models and per-category reports in", MODELS)