import io
import logging
import os
from pathlib import Path
from typing import Any, Dict

import numpy as np
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from analyze_pipeline import (
    _ensure_acceleration_column,
    _prepare_session_timeseries,
    _validate_input_columns,
    compute_composite_risk,
    compute_consistency,
    compute_efficiency,
    compute_recovery,
    load_models,
    setup_logging,
)


app = FastAPI(title="AntiDOPE Analysis API", version="1.0.0")
MODELS: Dict[str, Any] | None = None

cors_origins_raw = os.getenv("APP_CORS_ORIGINS", "*").strip()
if cors_origins_raw == "*":
    cors_origins = ["*"]
else:
    cors_origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def run_pipeline_from_dataframe(df: pd.DataFrame, models: Dict[str, Any]) -> Dict[str, Any]:
    _validate_input_columns(df)
    df = _ensure_acceleration_column(df)

    athlete_ids = df["athlete_id"].dropna().astype(str).unique()
    if len(athlete_ids) == 0:
        raise ValueError("No athlete_id values found in input CSV")

    athlete_id = athlete_ids[0]
    athlete_df = df[df["athlete_id"].astype(str) == athlete_id].copy()
    athlete_df, session_summary = _prepare_session_timeseries(athlete_df)

    efficiency_result = compute_efficiency(
        athlete_df,
        models["reg_model"],
        models["scaler"],
    )
    recovery_result = compute_recovery(athlete_df)
    consistency_result = compute_consistency(
        athlete_df,
        models["iso_model"],
        models["scaler"],
    )

    efficiency_index = float(efficiency_result["score"])
    recovery_score = float(recovery_result["score"])
    consistency_score = float(consistency_result["score"])
    efficiency_confidence = float(np.clip(float(efficiency_result["confidence"]) / 100.0, 0.0, 1.0))
    recovery_confidence = float(np.clip(float(recovery_result["confidence"]) / 100.0, 0.0, 1.0))
    consistency_confidence = float(np.clip(float(consistency_result["confidence"]) / 100.0, 0.0, 1.0))

    composite = compute_composite_risk(
        efficiency_index=efficiency_index,
        recovery_score=recovery_score,
        consistency_score=consistency_score,
        efficiency_confidence=efficiency_confidence,
        recovery_confidence=recovery_confidence,
        consistency_confidence=consistency_confidence,
    )

    from datetime import datetime, timezone

    return {
        "athlete_id": str(athlete_id),
        "efficiency_index": round(efficiency_index, 2),
        "recovery_score": round(recovery_score, 2),
        "consistency_score": round(consistency_score, 2),
        "efficiency_confidence": round(efficiency_confidence, 4),
        "recovery_confidence": round(recovery_confidence, 4),
        "consistency_confidence": round(consistency_confidence, 4),
        "trend_component": composite["trend_component"],
        "anomaly_component": composite["anomaly_component"],
        "final_risk_score": composite["final_risk_score"],
        "risk_level": composite["risk_level"],
        "confidence": composite["confidence"],
        "composite_confidence": composite["confidence"],
        "composite_calculation": composite["calculation"],
        "module_details": {
            "efficiency": efficiency_result["details"],
            "recovery": recovery_result["details"],
            "consistency": consistency_result["details"],
        },
        "session_summary": session_summary,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.on_event("startup")
def startup_event() -> None:
    global MODELS
    setup_logging()
    base_path = Path(__file__).resolve().parent
    MODELS = load_models(base_path=base_path)
    logging.info("API startup complete. Models loaded.")


@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "models_loaded": MODELS is not None,
    }


@app.get("/")
def root() -> Dict[str, str]:
    return {
        "message": "AntiDOPE API is running",
        "docs": "/docs",
        "health": "/health",
    }


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)) -> Dict[str, Any]:
    if MODELS is None:
        raise HTTPException(status_code=503, detail="Models are not loaded")

    filename = file.filename or ""
    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
        result = run_pipeline_from_dataframe(df, MODELS)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logging.exception("Failed to analyze uploaded CSV")
        raise HTTPException(status_code=500, detail=f"Internal error: {exc}") from exc


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("api:app", host=host, port=port, reload=False)