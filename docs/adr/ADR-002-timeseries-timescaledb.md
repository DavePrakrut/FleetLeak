# ADR-002: Time-Series Storage — PostgreSQL + TimescaleDB Hypertables

## Status
Accepted

## Context
Fleet telemetry streams continuously generate time-stamped location, speed, fuel rate, RPM, and diagnostic events. FleetLeak needs:
1. High-throughput ingestion of time-series data.
2. Relational 3NF integrity for fleet assets, drivers, depots, leases, and tenant security.
3. Continuous time-bucket rollups (1-minute, 1-hour, 1-day) for real-time dashboards and ML feature engineering.
4. Native SQL join capabilities across business metadata and raw sensor observations.

## Decision
We deploy **TimescaleDB** on top of PostgreSQL 16.
- Raw and canonical telemetry are stored in Timescale **hypertables** partitioned along the time dimension (1-day chunks) and space-partitioned by hash of `vehicle_id`.
- Continuous aggregates (`agg_vehicle_daily_stats`, `agg_depot_daily_idle`) automatically maintain pre-aggregated metrics with zero manual batch ETL overhead.
- Hypertable compression policies compress older chunks using Delta-of-delta and Gorilla compression algorithms, yielding a 90%+ disk footprint reduction.

## Alternatives Considered
- **Plain Vanilla PostgreSQL**: Table bloat and B-Tree index degradation at 100M+ rows degrade write performance and query latency.
- **Apache Cassandra / ScyllaDB**: Excellent write throughput, but lacks ACID transactions, complex SQL joins between fleet finance tables and telemetry, and native Row-Level Security (RLS).
- **InfluxDB**: Time-series optimized, but poor relational join capabilities with business tables (contracts, drivers, cost assumptions).

## Consequences
- Single database engine for relational business entities, time-series metrics, and vector embeddings (via pgvector).
- Massive reduction in architectural operational complexity.
