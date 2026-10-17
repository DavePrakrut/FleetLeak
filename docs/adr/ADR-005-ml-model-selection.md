# ADR-005: Context-Aware Machine Learning Model Selection — LightGBM & Isolation Forest over Deep Learning / LSTM

## Status
Accepted

## Context
Detecting fuel waste cannot rely solely on static heuristics (e.g., fixed "idle > 10 minutes"). Static thresholds fail to account for operational context:
- Vehicle weight classes (Class 8 heavy trucks vs Class 1 light vans have vastly different legitimate dwell idling profiles).
- Regional ambient weather proxies (cabin heating/cooling requirements).
- Depot-specific dispatch schedules and day-of-week traffic conditions.

At the same time, deploying deep recurrent neural networks (LSTMs, Transformers) introduces excessive model inference latency, opaque reasoning, high GPU operational costs, and operational vulnerability on edge laptops.

## Decision
We deploy a two-model lightweight statistical/gradient boosted ensemble:
1. **LightGBM Gradient Boosted Regressor**: Predicts the *expected idle fraction* conditioned on operational features (`vehicle_class`, `depot_id`, `shift_hour`, `day_of_week`, `trip_distance`, `avg_speed`, `payload_weight_kg`). Anomalous vehicles are flagged when the observed idle duration exceeds the predicted conditional expectation by more than $2.5\sigma$ residual threshold.
2. **Isolation Forest**: Unsupervised anomaly detection over multi-dimensional telemetry aggregates (`idle_ratio`, `harsh_accel_rate`, `fuel_per_km_residual`) to catch complex compound leak patterns.

## Alternatives Considered
- **Fixed Rule Baseline** (`idle > 10 min`): High false-positive rate on heavy duty refrigerated vehicles, high false-negative rate on delivery vans.
- **Deep LSTM / Transformer Models**: High training and scoring latency (>150ms vs <2ms for LightGBM), lack of feature importance explainability (SHAP values required for auditability), complex deployment dependencies.

## Consequences
- Fast sub-millisecond inference per vehicle-day.
- Native explainability via SHAP values directly fed to the AI Copilot to answer queries such as *"Why did vehicle V-102 receive an IDLE_EXCESS leak alert?"*.
- Transparent evaluation metrics (Precision, Recall, F1, and captured dollar savings) against ground-truth injected leaks.
