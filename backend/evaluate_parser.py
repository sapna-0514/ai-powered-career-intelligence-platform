import json
from collections import Counter
from pathlib import Path
from pypdf import PdfReader
from docx import Document
from resume_parser import parse_resume
from skills import SKILLS

BASE = Path(__file__).parent / "eval"
RESUMES = BASE / "resumes"
LABELS = BASE / "labels.json"

# Every alias and canonical name maps to one canonical (lowercase) name
ALIAS = {}
for canonical, aliases in SKILLS.items():
    for n in [canonical] + aliases:
        ALIAS[n.lower()] = canonical.lower()
TAXONOMY = {k.lower() for k in SKILLS}


def canon(name):
    n = name.strip().lower()
    return ALIAS.get(n, n)


def read_file(path):
    ext = path.suffix.lower()
    if ext == ".pdf":
        return "\n".join((p.extract_text() or "") for p in PdfReader(str(path)).pages)
    if ext == ".docx":
        return "\n".join(p.text for p in Document(str(path)).paragraphs)
    return path.read_text(encoding="utf-8", errors="ignore")


def main():
    labels = json.loads(LABELS.read_text(encoding="utf-8"))
    tp = fp = gold_in_total = gold_total = 0
    outside = Counter()
    edu_ok = edu_total = exp_ok = exp_total = used = 0

    for name, gold in labels.items():
        files = list(RESUMES.glob(name + ".*"))
        if not files:
            print(f"[skip] no file found for {name}")
            continue
        used += 1
        parsed = parse_resume(read_file(files[0]))

        got = {canon(s) for s in parsed["skills"]}
        want = {canon(s) for s in gold.get("skills", [])}
        want_in = want & TAXONOMY

        tp += len(got & want)
        fp += len(got - want)
        gold_in_total += len(want_in)
        gold_total += len(want)
        outside.update(want - TAXONOMY)

        wrong, missed = sorted(got - want), sorted(want_in - got)
        if wrong or missed:
            print(f"\n{name}")
            if wrong:
                print("  wrongly found :", ", ".join(wrong))
            if missed:
                print("  missed (in skills.py):", ", ".join(missed))

        if "education" in gold:
            edu_total += 1
            if parsed["education"] == gold["education"]:
                edu_ok += 1
            else:
                print(f"{name} education: expected '{gold['education']}', parser gave '{parsed['education']}'")
        if "experience_years" in gold:
            exp_total += 1
            if parsed["experience_years"] == gold["experience_years"]:
                exp_ok += 1
            else:
                print(f"{name} experience: expected {gold['experience_years']}, parser gave {parsed['experience_years']}")

    if not used:
        print("No resumes were evaluated. Check the file names and labels.json.")
        return

    precision = tp / (tp + fp) if tp + fp else 0
    recall_in = tp / gold_in_total if gold_in_total else 0
    recall_all = tp / gold_total if gold_total else 0

    print("\nLabelled skills NOT in skills.py (most common first):")
    for skill, n in outside.most_common(60):
        print(f"  {skill}  x{n}")

    print("\n==== Parser report ====")
    print(f"Resumes evaluated        : {used}")
    print(f"Skill precision          : {precision:.1%}   (target 90%)")
    print(f"Recall (skills in list)  : {recall_in:.1%}")
    print(f"Recall (all labelled)    : {recall_all:.1%}")
    if edu_total:
        print(f"Education correct        : {edu_ok}/{edu_total}")
    if exp_total:
        print(f"Experience correct       : {exp_ok}/{exp_total}")


if __name__ == "__main__":
    main()
    