from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import ExtraTreesRegressor, GradientBoostingRegressor, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
ARTIFACTS = ROOT / "artifacts"
ARTIFACTS.mkdir(exist_ok=True)

RANDOM_STATE = 42


def split_features(df: pd.DataFrame, target: str) -> tuple[pd.DataFrame, pd.Series]:
    target_values = pd.to_numeric(df[target], errors="coerce")
    clean = df.loc[target_values.notna()].copy()
    target_values = target_values.loc[clean.index]
    if clean.empty:
      raise ValueError(f"{target} has no usable numeric rows")
    return clean.drop(columns=[target]), target_values


def build_preprocessor(x: pd.DataFrame) -> ColumnTransformer:
    categorical = [column for column in x.columns if x[column].dtype == "object"]
    numeric = [column for column in x.columns if column not in categorical]
    return ColumnTransformer(
        transformers=[
            ("num", Pipeline([("imputer", SimpleImputer()), ("scale", StandardScaler())]), numeric),
            (
                "cat",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                categorical,
            ),
        ]
    )


def candidate_models() -> dict[str, Any]:
    return {
        "random_forest": RandomForestRegressor(
            n_estimators=180,
            random_state=RANDOM_STATE,
            min_samples_leaf=4,
            max_depth=16,
            n_jobs=-1,
        ),
        "extra_trees": ExtraTreesRegressor(
            n_estimators=220,
            random_state=RANDOM_STATE,
            min_samples_leaf=3,
            max_depth=18,
            n_jobs=-1,
        ),
        "gradient_boosting": GradientBoostingRegressor(
            random_state=RANDOM_STATE,
            n_estimators=180,
            learning_rate=0.04,
            max_depth=3,
        ),
    }


def train_best_regressor(x: pd.DataFrame, y: pd.Series, artifact_name: str) -> dict[str, Any]:
    x_train, x_valid, y_train, y_valid = train_test_split(
        x,
        y,
        test_size=0.2,
        random_state=RANDOM_STATE,
    )
    metrics: list[dict[str, Any]] = []
    best_pipeline: Pipeline | None = None
    best_metric: float | None = None
    best_name = ""

    for name, estimator in candidate_models().items():
        pipeline = Pipeline(
            steps=[
                ("preprocess", build_preprocessor(x_train)),
                ("model", estimator),
            ]
        )
        pipeline.fit(x_train, y_train)
        predictions = pipeline.predict(x_valid)
        mae = float(mean_absolute_error(y_valid, predictions))
        r2 = float(r2_score(y_valid, predictions))
        metrics.append({"model": name, "mae": round(mae, 5), "r2": round(r2, 5)})
        if best_metric is None or mae < best_metric:
            best_metric = mae
            best_pipeline = pipeline
            best_name = name

    if best_pipeline is None:
        raise RuntimeError("No candidate model was trained")

    best_pipeline.fit(x, y)
    joblib.dump(best_pipeline, ARTIFACTS / artifact_name)
    return {
        "selectedModel": best_name,
        "validation": metrics,
    }


def train_burnout() -> dict[str, Any]:
    path = DATA / "burnout.csv"
    if not path.exists():
        raise FileNotFoundError("Missing ml/data/burnout.csv")

    df = pd.read_csv(path)
    target = "Burn Rate"
    if target not in df.columns:
        raise ValueError("burnout.csv must contain a 'Burn Rate' target column")

    x, y = split_features(df, target)
    return train_best_regressor(x, y, "burnout-model.joblib")


def normalize_disengagement_target(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series, str]:
    if "Attrition" in df.columns:
        values = df["Attrition"].astype(str).str.strip().str.lower()
        y = values.map({"yes": 1.0, "y": 1.0, "true": 1.0, "1": 1.0, "no": 0.0, "n": 0.0, "false": 0.0, "0": 0.0})
        clean = df.loc[y.notna()].copy()
        return clean.drop(columns=["Attrition"]), y.loc[clean.index], "Attrition"

    candidates = ["engagement_score", "satisfaction_level", "JobSatisfaction", "satisfaction"]
    target = next((column for column in candidates if column in df.columns), None)
    if not target:
        raise ValueError(f"engagement.csv must contain 'Attrition' or one of {candidates}")

    x, score = split_features(df, target)
    max_score = float(score.max())
    if max_score <= 0:
        raise ValueError(f"Target '{target}' must have a positive max value")
    disengagement = 1 - (score / max_score)
    return x, disengagement, target


def train_disengagement() -> dict[str, Any]:
    path = DATA / "engagement.csv"
    if not path.exists():
        raise FileNotFoundError("Missing ml/data/engagement.csv")

    df = pd.read_csv(path)
    x, y, target = normalize_disengagement_target(df)
    result = train_best_regressor(x, y, "disengagement-model.joblib")
    result["targetColumn"] = target
    return result


if __name__ == "__main__":
    burnout = train_burnout()
    disengagement = train_disengagement()
    metadata = {
        "modelVersion": "local-qvt-sklearn-2",
        "trainedAt": datetime.now(timezone.utc).isoformat(),
        "note": "Local demo training. Backend aggregation remains privacy-preserving and must not expose individual predictions.",
        "burnout": burnout,
        "disengagement": disengagement,
        "sources": [
            "kaggle:blurredmachine/are-your-employees-burning-out",
            "kaggle employee engagement/satisfaction or attrition dataset",
        ],
    }
    (ARTIFACTS / "qvt-model-metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print("QVT model artifacts written to", ARTIFACTS)
    print(json.dumps(metadata, indent=2))
