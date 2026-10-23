from pathlib import Path
import pandas as pd
from sklearn.model_selection import train_test_split

DATA = Path(__file__).parent / "data"
MIN_PER_CATEGORY = 10   # categories smaller than this are dropped

# Set this to a list such as ["INFORMATION-TECHNOLOGY", "ENGINEERING", "DESIGNER"]
# to keep only those job categories. None keeps all of them.
KEEP_CATEGORIES = None

# Find the CSV wherever it is inside backend/data (but never our own outputs)
candidates = [p for p in DATA.rglob("*.csv") if p.name not in ("train.csv", "val.csv")]
preferred = [p for p in candidates if p.name.lower() == "resume.csv"]
files = preferred or candidates
if not files:
    raise SystemExit("No CSV found inside backend/data. Check where Resume.csv is.")
FILE = files[0]
print("Using file:", FILE)

df = pd.read_csv(FILE, encoding_errors="ignore")
print("Columns:", list(df.columns))
print("Rows loaded:", len(df))

# Find the text and label columns (names differ between datasets)
text_col = next((c for c in ("Resume_str", "Resume", "resume_text", "Resume_text")
                 if c in df.columns), None)
label_col = next((c for c in ("Category", "category", "label")
                  if c in df.columns), None)
if not text_col or not label_col:
    raise SystemExit("Could not find the text/label columns. "
                     "Send me the 'Columns:' line above.")
df = df.rename(columns={text_col: "text", label_col: "label"})[["text", "label"]]

# 1. Clean
df = df.dropna()
df["text"] = df["text"].astype(str).str.replace(r"\s+", " ", regex=True).str.strip()
df["label"] = df["label"].astype(str).str.strip()
df = df[df["text"].str.len() > 100]

if KEEP_CATEGORIES:
    df = df[df["label"].isin(KEEP_CATEGORIES)]

# 2. Remove duplicates. If the same resume were in both train and validation,
#    the accuracy would look better than it really is.
before = len(df)
df = df.drop_duplicates(subset="text")
print(f"Duplicate resumes removed: {before - len(df)}")

# 3. Drop job categories that are too small to learn from
counts = df["label"].value_counts()
small = counts[counts < MIN_PER_CATEGORY]
if len(small):
    print("\nDropped small categories:", ", ".join(f"{k} ({v})" for k, v in small.items()))
df = df[df["label"].isin(counts[counts >= MIN_PER_CATEGORY].index)]

print("\nResumes per category:")
print(df["label"].value_counts().to_string())
print(f"\nCategories: {df['label'].nunique()}   Resumes: {len(df)}")

if df["label"].nunique() < 2 or len(df) < 20:
    raise SystemExit("\nToo little data left to train on. Lower MIN_PER_CATEGORY "
                     "or use a bigger dataset.")

# 4. Split 80% train / 20% validation, keeping category proportions equal
train, val = train_test_split(
    df, test_size=0.2, random_state=42, stratify=df["label"]
)
train.to_csv(DATA / "train.csv", index=False)
val.to_csv(DATA / "val.csv", index=False)
print(f"\nSaved train.csv ({len(train)} rows) and val.csv ({len(val)} rows) in {DATA}")