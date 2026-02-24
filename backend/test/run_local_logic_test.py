from __future__ import annotations

import json
import sys
from pathlib import Path

TEST_DIR = Path(__file__).resolve().parent
BACKEND_DIR = TEST_DIR.parent

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from analyze_pipeline import load_models, run_pipeline  # noqa: E402


NO_ANOMALY_FILE = TEST_DIR / "no anomaly.csv"
YES_ANOMALY_FILE = TEST_DIR / "yes anomaly.csv"


def run_case(models, csv_path: Path) -> dict:
    if not csv_path.exists():
        raise FileNotFoundError(f"Missing input file: {csv_path}")
    result = run_pipeline(str(csv_path), models)
    return {
        "file": csv_path.name,
        "efficiency_index": result["efficiency_index"],
        "recovery_score": result["recovery_score"],
        "consistency_score": result["consistency_score"],
        "final_risk_score": result["final_risk_score"],
        "risk_level": result["risk_level"],
        "confidence": result["confidence"],
    }


def main() -> None:
    models = load_models(base_path=BACKEND_DIR)

    no_anomaly = run_case(models, NO_ANOMALY_FILE)
    yes_anomaly = run_case(models, YES_ANOMALY_FILE)

    print("\n=== Local Logic Test (AntiDOPE Pipeline) ===")
    print(json.dumps({"no_anomaly": no_anomaly, "yes_anomaly": yes_anomaly}, indent=2))

    print("\n=== Quick Assertions ===")
    if yes_anomaly["final_risk_score"] >= no_anomaly["final_risk_score"]:
        print("[PASS] yes anomaly risk >= no anomaly risk")
    else:
        print("[WARN] yes anomaly risk < no anomaly risk")

    if no_anomaly["risk_level"] in {"Low", "Moderate"}:
        print("[PASS] no anomaly risk level is Low/Moderate")
    else:
        print("[WARN] no anomaly risk level is High")

    if yes_anomaly["risk_level"] == "High":
        print("[PASS] yes anomaly risk level is High")
    else:
        print("[WARN] yes anomaly risk level is not High")


if __name__ == "__main__":
    main()
