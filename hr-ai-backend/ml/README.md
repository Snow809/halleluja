# QVT local model training

This folder is intentionally local-first.

The repository keeps the lightweight training code and committed demo model artifacts so a fresh clone can show QVT predictions immediately.

Do not commit Kaggle datasets or virtual environments. The repository `.gitignore` excludes:

- `ml/data/`
- `ml/.venv/`

## Expected local files

Place the downloaded CSV files here:

- `ml/data/burnout.csv` from Kaggle “Are Your Employees Burning Out?”
- `ml/data/engagement.csv` from an employee engagement, satisfaction, or attrition dataset

The disengagement trainer accepts either:

- `Attrition` as a yes/no-style target; or
- one of `engagement_score`, `satisfaction_level`, `JobSatisfaction`, `satisfaction`.

## Train

```bash
cd hr-ai-backend/ml
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
.venv/Scripts/python train_qvt_models.py
```

The script writes:

- `ml/artifacts/burnout-model.joblib`
- `ml/artifacts/disengagement-model.joblib`
- `ml/artifacts/qvt-model-metadata.json`

The metadata includes validation MAE/R² for several scikit-learn tabular models and the selected model for each target. If you retrain locally, commit updated artifacts only when you want the shared demo model to change.

## Current product behavior

The NestJS QVT API currently keeps privacy by exposing aggregate-only results. The local model artifacts act as a trained-model readiness signal while the API computes anonymized aggregate risk from internal QVT fields.

For a stronger production version, add a Python model-serving worker that loads the `.joblib` artifacts, computes individual predictions in memory, and persists only aggregate snapshots. That is the right point to compare XGBoost/LightGBM/CatBoost against the current scikit-learn baseline.
