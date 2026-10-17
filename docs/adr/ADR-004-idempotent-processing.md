# ADR-004: At-Least-Once Delivery with Idempotent Deduplication (Effectively-Once Processing)

## Status
Accepted

## Context
Vehicle telemetry transmitted across cellular and satellite IoT connections suffers from network retries, connection drops, and out-of-order packet re-transmissions. Approximately 2% of raw telemetry messages are duplicates, and 3% arrive out-of-order. A strict exactly-once streaming guarantee across distributed brokers, processors, and multi-tenant databases introduces severe two-phase commit (2PC) latency penalties.

## Decision
We implement an **At-Least-Once streaming pipeline paired with Idempotent Storage**, producing **Effectively-Once** semantics end-to-end:
1. **Natural Deduplication Key**: Composite key `(vehicle_id, seq, ts_utc)`.
2. **Two-Tier Deduplication Filter**:
   - **Tier 1 (L1 In-Memory Bloom Filter / Redis SETNX)**: Fast-path rejection of duplicate packets within a 1-hour sliding time window ($O(1)$ amortized lookup).
   - **Tier 2 (L2 Database Unique Constraint)**: Unique index `uq_telemetry_dedupe` on `(vehicle_id, seq, ts_utc)` in PostgreSQL/TimescaleDB using `ON CONFLICT DO NOTHING`.
3. **Idempotent REST APIs**: All state-modifying write operations (e.g., approving recommendations, submitting manual overrides) require an `Idempotency-Key` or `ETag` header cached in Redis for 24 hours.

## Consequences
- Guarantees zero double-counting of fuel burn, idle hours, or financial leak penalties.
- Keeps ingestion latency under 2 seconds without distributed locking overhead.
