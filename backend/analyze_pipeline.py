import argparse
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Tuple

import joblib
import numpy as np
import pandas as pd


EPSILON = 1e-8
ROLLING_WINDOW = 5
BASELINE_RECOVERY_K = 0.02
EFFICIENCY_ALPHA = 1.2
RECOVERY_ALPHA = 2.0
CONSISTENCY_ALPHA = 5.0
IF_EXPECTED_LOW = -0.5
IF_EXPECTED_HIGH = 0.5

BASE_REQUIRED_COLUMNS = {
    "athlete_id",
    "timestamp",
    "heart_rate",
    "recovery_heart_rate",
    "time_post_exertion",
}


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
    )


def safe_clip(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return float(np.clip(value, low, high))


def sigmoid(x: float) -> float:
    return float(1.0 / (1.0 + np.exp(-x)))


def _distribution_reliability(scaler: Any, features: np.ndarray) -> tuple[float, float | None]:
    if not (hasattr(scaler, "mean_") and hasattr(scaler, "scale_")):
        return 1.0, None

    n_input = int(features.shape[1])
    means = np.asarray(scaler.mean_[:n_input], dtype=float)
    scales = np.asarray(scaler.scale_[:n_input], dtype=float)
    scales = np.where(np.abs(scales) < EPSILON, 1.0, scales)

    feature_mean = np.nanmean(features, axis=0)
    z = np.abs((feature_mean - means) / scales)
    z_mean = float(np.nanmean(z)) if np.all(np.isfinite(z)) else float("nan")
    if not np.isfinite(z_mean):
        return 1.0, None

    reliability = sigmoid(-(z_mean - 3.0))
    return float(np.clip(reliability, 0.05, 1.0)), z_mean


def _inverse_scale_prediction_if_available(
    scaler: Any,
    predicted: np.ndarray,
    n_input_features: int,
) -> np.ndarray:
    pred = np.asarray(predicted, dtype=float).reshape(-1)
    if not (hasattr(scaler, "mean_") and hasattr(scaler, "scale_") and hasattr(scaler, "n_features_in_")):
        return pred

    n_scaler = int(scaler.n_features_in_)
    if n_scaler != n_input_features + 1:
        return pred

    target_mean = float(scaler.mean_[n_input_features])
    target_scale = float(scaler.scale_[n_input_features])
    target_scale = target_scale if abs(target_scale) > EPSILON else 1.0
    return pred * target_scale + target_mean


def load_models(base_path: Path = Path(".")) -> Dict[str, Any]:
    logging.info("Loading model artifacts from %s", base_path.resolve())
    reg_model = joblib.load(base_path / "reg_model.pkl")
    iso_model = joblib.load(base_path / "iso_model.pkl")
    scaler = joblib.load(base_path / "scaler.pkl")
    logging.info("Loaded reg_model.pkl, iso_model.pkl, scaler.pkl")
    return {
        "reg_model": reg_model,
        "iso_model": iso_model,
        "scaler": scaler,
    }


def _validate_input_columns(df: pd.DataFrame) -> None:
    missing_base = sorted(BASE_REQUIRED_COLUMNS - set(df.columns))
    if missing_base:
        raise ValueError("Missing required columns: " + ", ".join(missing_base))

    has_acceleration = "acceleration" in df.columns
    has_acc_components = all(col in df.columns for col in ("acc_x", "acc_y", "acc_z"))
    if not has_acceleration and not has_acc_components:
        raise ValueError(
            "Missing acceleration input for efficiency layer. Provide either 'acceleration' "
            "or all of: 'acc_x', 'acc_y', 'acc_z'."
        )


def _ensure_acceleration_column(df: pd.DataFrame) -> pd.DataFrame:
    if "acceleration" in df.columns:
        return df

    if all(col in df.columns for col in ("acc_x", "acc_y", "acc_z")):
        out = df.copy()
        out["acceleration"] = np.sqrt(
            pd.to_numeric(out["acc_x"], errors="coerce") ** 2
            + pd.to_numeric(out["acc_y"], errors="coerce") ** 2
            + pd.to_numeric(out["acc_z"], errors="coerce") ** 2
        )
        return out

    return df


def _to_numeric(df: pd.DataFrame, columns: Tuple[str, ...]) -> pd.DataFrame:
    out = df.copy()
    for col in columns:
        out[col] = pd.to_numeric(out[col], errors="coerce")
    out = out.dropna(subset=list(columns))
    return out


def _prepare_session_timeseries(df: pd.DataFrame) -> tuple[pd.DataFrame, Dict[str, Any]]:
    out = df.copy()

    ts_num = pd.to_numeric(out["timestamp"], errors="coerce")
    num_valid = ts_num.notna().mean() >= 0.8

    if num_valid:
        ts_sec = ts_num - float(np.nanmin(ts_num.to_numpy(dtype=float)))
    else:
        parsed_dt = pd.to_datetime(out["timestamp"], errors="coerce")
        dt_valid = parsed_dt.notna().mean() >= 0.8
        if not dt_valid:
            raise ValueError("timestamp must be parseable as datetime or numeric")
        ts_sec = (parsed_dt - parsed_dt.min()).dt.total_seconds()

    out["session_second"] = pd.to_numeric(ts_sec, errors="coerce")
    out = out.dropna(subset=["session_second"]).copy()
    out = out.sort_values("session_second")

    numeric_cols = out.select_dtypes(include=[np.number]).columns.tolist()
    if "session_second" not in numeric_cols:
        numeric_cols.append("session_second")

    grouped = out.groupby("session_second", as_index=False)[numeric_cols].mean()
    grouped = grouped.sort_values("session_second")

    if grouped.empty:
        raise ValueError("No valid rows after timestamp processing")

    max_sec = int(np.ceil(float(grouped["session_second"].max())))
    full_index = np.arange(0, max_sec + 1, dtype=float)

    reindexed = grouped.set_index("session_second").reindex(full_index)
    reindexed.index.name = "session_second"
    reindexed = reindexed.interpolate(method="index", limit_direction="both")
    reindexed = reindexed.reset_index()

    resampled = reindexed.copy()
    if "athlete_id" in out.columns:
        resampled["athlete_id"] = str(out["athlete_id"].iloc[0])

    original_diffs = np.diff(grouped["session_second"].to_numpy(dtype=float))
    strict_1s = bool(
        len(original_diffs) > 0
        and np.all(np.isfinite(original_diffs))
        and np.allclose(original_diffs, 1.0, atol=1e-6)
    )

    summary = {
        "original_samples": int(len(out)),
        "resampled_samples": int(len(resampled)),
        "duration_seconds": int(max_sec),
        "strict_one_second_input": strict_1s,
        "resampled_to_one_second": not strict_1s,
    }
    return resampled, summary


def _transform_with_scaler(scaler: Any, features: np.ndarray) -> np.ndarray:
    if hasattr(scaler, "n_features_in_"):
        n_scaler = int(scaler.n_features_in_)
    else:
        n_scaler = int(features.shape[1])

    n_input = int(features.shape[1])

    if n_scaler == n_input:
        return scaler.transform(features)

    if n_scaler > n_input and hasattr(scaler, "mean_") and hasattr(scaler, "scale_"):
        means = np.asarray(scaler.mean_[:n_input], dtype=float)
        scales = np.asarray(scaler.scale_[:n_input], dtype=float)
        scales = np.where(np.abs(scales) < EPSILON, 1.0, scales)
        logging.warning(
            "Scaler expects %d features, got %d. Using first %d scaler dimensions.",
            n_scaler,
            n_input,
            n_input,
        )
        return (features - means) / scales

    logging.warning(
        "Scaler/input feature mismatch (%d vs %d). Falling back to scaler transform attempt.",
        n_scaler,
        n_input,
    )
    return scaler.transform(features)


def compute_efficiency(df: pd.DataFrame, reg_model: Any, scaler: Any) -> Dict[str, Any]:
    logging.info("Computing efficiency index")
    work = _to_numeric(df, ("heart_rate", "acceleration", "session_second"))
    if work.empty:
        return {
            "score": 50.0,
            "confidence": 25.0,
            "details": {
                "samples_used": 0,
                "residual_rms": 0.0,
                "residual_mad": 0.0,
            },
        }

    n_features = int(getattr(reg_model, "n_features_in_", 1))
    if n_features == 1:
        reg_features = work[["heart_rate"]].to_numpy(dtype=float)
    elif n_features == 2:
        reg_features = work[["heart_rate", "session_second"]].to_numpy(dtype=float)
    else:
        candidate = ["heart_rate", "session_second", "acceleration"]
        available = [col for col in candidate if col in work.columns]
        reg_features = work[available].to_numpy(dtype=float)
        if reg_features.shape[1] > n_features:
            reg_features = reg_features[:, :n_features]
        elif reg_features.shape[1] < n_features:
            pad = np.zeros((reg_features.shape[0], n_features - reg_features.shape[1]), dtype=float)
            reg_features = np.hstack([reg_features, pad])

    reg_features_scaled = _transform_with_scaler(scaler, reg_features)
    predicted_acceleration_raw = reg_model.predict(reg_features_scaled)
    predicted_acceleration = _inverse_scale_prediction_if_available(
        scaler,
        predicted_acceleration_raw,
        n_input_features=reg_features.shape[1],
    )

    actual_acceleration = work["acceleration"].to_numpy(dtype=float)
    residual = actual_acceleration - predicted_acceleration

    residual_rms = float(np.sqrt(np.mean(np.square(residual))))
    residual_mad = float(np.mean(np.abs(residual)))
    acc_std = float(np.std(actual_acceleration))
    standardized_residual = residual_rms / max(acc_std, EPSILON)
    efficiency_score = safe_clip(100.0 * sigmoid(EFFICIENCY_ALPHA * (standardized_residual - 1.0)))

    ss_res = float(np.sum(np.square(residual)))
    ss_tot = float(np.sum(np.square(actual_acceleration - np.mean(actual_acceleration))))
    r2 = 1.0 - (ss_res / (ss_tot + EPSILON))
    r2 = float(np.clip(r2, -1.0, 1.0))

    r2_clipped = float(np.clip(r2, 0.0, 1.0))
    if r2 < 0.0:
        r2_confidence = min(0.35, 0.2 + 0.15 * sigmoid(r2 * 4.0))
    else:
        r2_confidence = 0.2 + 0.8 * r2_clipped

    sample_factor = min(1.0, len(work) / 30.0)
    sample_reliability = 0.5 + 0.5 * sample_factor
    dist_reliability, distribution_z_mean = _distribution_reliability(scaler, reg_features)
    efficiency_confidence = float(np.clip(r2_confidence * sample_reliability * dist_reliability, 0.0, 1.0))

    logging.info(
        "Efficiency debug | predicted_acc mean=%.6f min=%.6f max=%.6f | residual_rms=%.6f residual_mad=%.6f std_residual=%.6f r2=%.6f dist_z=%.6f",
        float(np.mean(predicted_acceleration)),
        float(np.min(predicted_acceleration)),
        float(np.max(predicted_acceleration)),
        residual_rms,
        residual_mad,
        standardized_residual,
        r2,
        distribution_z_mean if distribution_z_mean is not None else float("nan"),
    )

    return {
        "score": round(efficiency_score, 2),
        "confidence": round(efficiency_confidence * 100.0, 2),
        "details": {
            "samples_used": int(len(work)),
            "residual_rms": round(residual_rms, 6),
            "residual_mad": round(residual_mad, 6),
            "acceleration_std": round(acc_std, 6),
            "standardized_residual": round(standardized_residual, 6),
            "session_r2": round(r2, 6),
            "distribution_z_mean": round(distribution_z_mean, 6) if distribution_z_mean is not None else None,
        },
    }


def compute_consistency(df: pd.DataFrame, iso_model: Any, scaler: Any) -> Dict[str, Any]:
    logging.info("Computing consistency monitoring score")
    work = _to_numeric(df, ("heart_rate", "acceleration", "session_second"))
    if len(work) < 3:
        return {
            "score": 50.0,
            "confidence": 25.0,
            "details": {
                "samples_used": int(len(work)),
                "session_feature_vector": None,
                "decision_function": None,
            },
        }

    work = work.copy().sort_values("session_second")
    work["hr_variance"] = work["heart_rate"].rolling(ROLLING_WINDOW).var()
    work["hr_slope"] = work["heart_rate"].diff()

    roll_valid = work.dropna(subset=["hr_variance", "hr_slope"])
    if roll_valid.empty:
        return {
            "score": 50.0,
            "confidence": 25.0,
            "details": {
                "samples_used": 0,
                "session_feature_vector": None,
                "decision_function": None,
            },
        }

    hr_var = float(np.var(work["heart_rate"].to_numpy(dtype=float)))
    rolling_var_mean = float(np.mean(roll_valid["hr_variance"].to_numpy(dtype=float)))
    hr_acc_corr = float(work["heart_rate"].corr(work["acceleration"]))
    if not np.isfinite(hr_acc_corr):
        hr_acc_corr = 0.0

    session_feature_vector = np.array([[hr_var, rolling_var_mean, hr_acc_corr]], dtype=float)
    iso_features_scaled = _transform_with_scaler(scaler, session_feature_vector)

    decision = float(iso_model.decision_function(iso_features_scaled)[0])
    expected_width = max(IF_EXPECTED_HIGH - IF_EXPECTED_LOW, EPSILON)
    decision_percentile = float(np.clip((decision - IF_EXPECTED_LOW) / expected_width, 0.0, 1.0))
    anomaly_percentile = 1.0 - decision_percentile
    consistency_score = safe_clip(100.0 * sigmoid(CONSISTENCY_ALPHA * (anomaly_percentile - 0.5)))

    margin = abs(decision)
    margin_confidence = sigmoid((margin - 0.08) * 8.0)
    dist_reliability, distribution_z_mean = _distribution_reliability(scaler, session_feature_vector)
    consistency_confidence = float(np.clip(margin_confidence * dist_reliability, 0.0, 1.0))

    logging.info(
        "Consistency debug | decision=%.6f percentile=%.6f anomaly_percentile=%.6f margin=%.6f dist_z=%.6f",
        decision,
        decision_percentile,
        anomaly_percentile,
        margin,
        distribution_z_mean if distribution_z_mean is not None else float("nan"),
    )

    return {
        "score": round(consistency_score, 2),
        "confidence": round(consistency_confidence * 100.0, 2),
        "details": {
            "samples_used": int(len(work)),
            "session_feature_vector": [
                round(hr_var, 6),
                round(rolling_var_mean, 6),
                round(hr_acc_corr, 6),
            ],
            "decision_function": round(decision, 6),
            "decision_percentile": round(decision_percentile, 6),
            "anomaly_percentile": round(anomaly_percentile, 6),
            "margin": round(margin, 6),
            "distribution_z_mean": round(distribution_z_mean, 6) if distribution_z_mean is not None else None,
        },
    }


def compute_recovery(df: pd.DataFrame, baseline_k: float = BASELINE_RECOVERY_K) -> Dict[str, Any]:
    logging.info("Computing recovery pattern score")
    work = _to_numeric(df, ("heart_rate", "recovery_heart_rate", "session_second"))
    if work.empty:
        return {
            "score": 50.0,
            "confidence": 25.0,
            "details": {
                "samples_used": 0,
                "k_est": None,
                "baseline_k": float(baseline_k),
                "relative_deviation": None,
            },
        }

    work = work.sort_values("session_second").copy()

    peak_idx = int(work["heart_rate"].idxmax())
    recovery = work.loc[peak_idx:].copy()
    if len(recovery) < 3:
        return {
            "score": 50.0,
            "confidence": 25.0,
            "details": {
                "samples_used": 0,
                "k_est": None,
                "baseline_k": float(baseline_k),
                "relative_deviation": None,
            },
        }

    if recovery["recovery_heart_rate"].notna().any():
        rec_hr = recovery["recovery_heart_rate"].to_numpy(dtype=float)
    else:
        rec_hr = recovery["heart_rate"].to_numpy(dtype=float)

    peak_hr = float(np.nanmax(recovery["heart_rate"].to_numpy(dtype=float)))
    tail_window = max(3, int(len(recovery) * 0.1))
    hr_floor = float(np.nanmedian(rec_hr[-tail_window:]))
    hr_floor = max(30.0, hr_floor)

    t = recovery["session_second"].to_numpy(dtype=float)
    t = t - t[0]

    numerator = rec_hr - hr_floor
    denominator = peak_hr - hr_floor
    denominator = denominator if abs(denominator) > EPSILON else np.nan
    ratio = numerator / np.where(np.abs(denominator) < EPSILON, np.nan, denominator)

    ratio = np.clip(ratio, EPSILON, 1.0 - EPSILON)
    valid = np.isfinite(ratio)
    if not np.any(valid):
        return {
            "score": 50.0,
            "confidence": 25.0,
            "details": {
                "samples_used": int(len(recovery)),
                "k_est": None,
                "baseline_k": float(baseline_k),
                "relative_deviation": None,
            },
        }

    k_values = -np.log(ratio[valid]) / np.maximum(t[valid], EPSILON)
    k_values = k_values[np.isfinite(k_values)]
    if k_values.size == 0:
        return {
            "score": 50.0,
            "confidence": 25.0,
            "details": {
                "samples_used": int(len(recovery)),
                "k_est": None,
                "baseline_k": float(baseline_k),
                "relative_deviation": None,
            },
        }

    k_est = float(np.median(k_values))
    synthetic_baseline_k = float(np.clip(np.percentile(k_values, 35), 0.008, 0.08))
    baseline_k = float(0.7 * baseline_k + 0.3 * synthetic_baseline_k)
    relative_deviation = abs(k_est - baseline_k) / max(abs(baseline_k), EPSILON)
    recovery_score = safe_clip(100.0 * sigmoid(RECOVERY_ALPHA * (relative_deviation - 1.0)))

    rec_pred = hr_floor + (peak_hr - hr_floor) * np.exp(-k_est * np.maximum(t, 0.0))
    rec_rmse = float(np.sqrt(np.mean(np.square(rec_hr - rec_pred))))
    hr_range = max(abs(peak_hr - hr_floor), 1.0)
    normalized_rmse = rec_rmse / hr_range

    fit_confidence = 1.0 / (1.0 + normalized_rmse)
    sample_factor = 0.5 + 0.5 * min(1.0, len(k_values) / 20.0)
    recovery_confidence = float(np.clip(fit_confidence * sample_factor, 0.0, 1.0))

    logging.info(
        "Recovery debug | k_est=%.6f baseline_k=%.6f relative_deviation=%.6f rec_rmse=%.6f normalized_rmse=%.6f",
        k_est,
        baseline_k,
        relative_deviation,
        rec_rmse,
        normalized_rmse,
    )

    return {
        "score": round(recovery_score, 2),
        "confidence": round(recovery_confidence * 100.0, 2),
        "details": {
            "samples_used": int(len(k_values)),
            "peak_heart_rate": round(peak_hr, 6),
            "recovery_floor": round(hr_floor, 6),
            "k_est": round(k_est, 6),
            "baseline_k": float(baseline_k),
            "relative_deviation": round(float(relative_deviation), 6),
            "recovery_fit_rmse": round(rec_rmse, 6),
            "normalized_rmse": round(normalized_rmse, 6),
        },
    }


def compute_composite_risk(
    efficiency_index: float,
    recovery_score: float,
    consistency_score: float,
    efficiency_confidence: float,
    recovery_confidence: float,
    consistency_confidence: float,
) -> Dict[str, float | str | Dict[str, float]]:
    s1 = safe_clip(efficiency_index)
    s2 = safe_clip(recovery_score)
    s3 = safe_clip(consistency_score)

    c1 = float(np.clip(efficiency_confidence, 0.0, 1.0))
    c2 = float(np.clip(recovery_confidence, 0.0, 1.0))
    c3 = float(np.clip(consistency_confidence, 0.0, 1.0))

    epsilon = 0.01
    total_weight = c1 + c2 + c3
    final_risk_score = safe_clip(((s1 * c1) + (s2 * c2) + (s3 * c3)) / (total_weight + epsilon))

    trend_score = (s1 + s2) / 2.0
    anomaly_score = s3

    if final_risk_score <= 39:
        risk_level = "Low"
    elif final_risk_score <= 69:
        risk_level = "Moderate"
    else:
        risk_level = "High"

    confidence = float(np.clip((c1 + c2 + c3) / 3.0, 0.0, 1.0))

    return {
        "trend_component": round(trend_score, 2),
        "anomaly_component": round(anomaly_score, 2),
        "final_risk_score": round(final_risk_score, 2),
        "risk_level": risk_level,
        "confidence": round(confidence, 4),
        "calculation": {
            "final_formula": "((S1*C1)+(S2*C2)+(S3*C3)) / (C1+C2+C3+epsilon)",
            "confidence_formula": "mean(C1, C2, C3)",
            "epsilon": epsilon,
            "weights": {
                "C1_efficiency": round(c1, 4),
                "C2_recovery": round(c2, 4),
                "C3_consistency": round(c3, 4),
                "total_weight": round(total_weight, 4),
            },
        },
    }


def run_pipeline(csv_path: str, models: Dict[str, Any]) -> Dict[str, Any]:
    logging.info("Reading input CSV: %s", csv_path)
    df = pd.read_csv(csv_path)
    _validate_input_columns(df)
    df = _ensure_acceleration_column(df)

    athlete_ids = df["athlete_id"].dropna().astype(str).unique()
    if len(athlete_ids) == 0:
        raise ValueError("No athlete_id values found in input CSV")
    if len(athlete_ids) > 1:
        logging.warning("Multiple athlete_id values found. Using first athlete_id: %s", athlete_ids[0])
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

    result = {
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
    return result


def main() -> None:
    setup_logging()
    parser = argparse.ArgumentParser(
        description="Unified AntiDOPE analysis pipeline"
    )
    parser.add_argument(
        "csv_path",
        type=str,
        help="Path to input CSV with per-second schema (must include timestamp)",
    )
    args = parser.parse_args()

    try:
        base_path = Path(__file__).resolve().parent
        models = load_models(base_path=base_path)
        result = run_pipeline(args.csv_path, models)
        print(json.dumps(result, indent=2))
    except Exception as exc:
        logging.exception("Pipeline execution failed")
        error_payload = {
            "error": str(exc),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        print(json.dumps(error_payload, indent=2))
        raise SystemExit(1)


if __name__ == "__main__":
    main()