from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (classification_report, f1_score,
                             top_k_accuracy_score)
from sklearn.model_selection import GridSearchCV
from sklearn.pipeline import Pipeline

BASE = Path(__file__).parent
DATA = BASE / "data"
MODELS = BASE / "models"
MODELS.mkdir(exist_ok=True)

train = pd.read_csv(DATA / "train.csv")
val = pd.read_csv(DATA / "val.csv")


def strip_title(text):
    """Removes the leading ALL-CAPS job title, which gives the label away."""
    words = str(text).split()
    i = 0
    while i < len(words) and (words[i].isupper() or words[i] in {"&", "/", "-", "|"}):
        i += 1
    return " ".join(words[i:]) if i < len(words) else " ".join(words)


def run(name, X_train, X_val, save_as=None):
    pipe = Pipeline([
        ("tfidf", TfidfVectorizer(max_features=20000, ngram_range=(1, 2),
                                  min_df=2, sublinear_tf=True,
                                  stop_words="english")),
        ("clf", LogisticRegression(max_iter=3000)),
    ])
    # C is chosen by 5-fold cross-validation on the TRAINING data only
    search = GridSearchCV(pipe, {"clf__C": [1, 5, 20, 50]},
                          cv=5, scoring="accuracy", n_jobs=-1)
    search.fit(X_train, train["label"])
    model = search.best_estimator_

    proba = model.predict_proba(X_val)
    classes = model.classes_
    pred = classes[proba.argmax(axis=1)]
    y = val["label"].values

    print(f"\n==== {name} ====")
    print(f"Best C (from training CV) : {search.best_params_['clf__C']}")
    print(f"Top-1 accuracy : {(pred == y).mean():.1%}   (target 65%)")
    print(f"Top-3 accuracy : {top_k_accuracy_score(y, proba, k=3, labels=classes):.1%}")
    print(f"Top-5 accuracy : {top_k_accuracy_score(y, proba, k=5, labels=classes):.1%}")
    print(f"Macro F1       : {f1_score(y, pred, average='macro'):.3f}")

    rep = classification_report(y, pred, zero_division=0, output_dict=True)
    worst = sorted(((rep[c]["f1-score"], c) for c in classes))[:5]
    print("Weakest categories (F1):",
          ", ".join(f"{c} {f:.2f}" for f, c in worst))

    if save_as:
        joblib.dump(model, MODELS / save_as)
        (MODELS / (save_as + ".report.txt")).write_text(
            classification_report(y, pred, zero_division=0), encoding="utf-8")
    return model


run("With the job title heading (leaky)", train["text"], val["text"])

train_clean = train["text"].map(strip_title)
val_clean = val["text"].map(strip_title)
print("\nExample of a cleaned start:", train_clean.iloc[0][:100])
run("Title heading removed (fair)", train_clean, val_clean,
    save_as="baseline_tfidf.joblib")