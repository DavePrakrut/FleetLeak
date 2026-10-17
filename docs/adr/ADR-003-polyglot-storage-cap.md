# ADR-003: Polyglot Storage Architecture and CAP/PACELC Trade-Offs

## Status
Accepted

## Context
FleetLeak processes high-volume telemetry while also managing enterprise tenant isolation, relational fleet hierarchies, sub-millisecond hot vehicle lookup, cold analytical history, and vector similarity search for copilot policy retrieval. No single database engine can satisfy these divergent access patterns optimally.

## Decision
We implement a polyglot persistence architecture with clearly delineated data responsibilities and PACELC trade-offs:

| Store | Data Domain | Why Selected | CAP / PACELC Classification |
| :--- | :--- | :--- | :--- |
| **PostgreSQL 16 (3NF)** | Tenants, users, roles, depots, geofences, vehicle master, cost assumptions, leak events, audit logs | ACID guarantees, foreign key integrity, Row-Level Security (RLS) | **PC/EC (Consistent / Consistent)** |
| **TimescaleDB** | Canonical telemetry time series, continuous aggregate roll-ups | Partitioned hypertables, delta-of-delta compression, sub-second rollups | **PA/EL (Partition-tolerant, Low Latency ingest)** |
| **Redis 7** | Hot vehicle state, dedupe Bloom filter, token bucket rate limits, Top-K sketches | Sub-millisecond in-memory lookups, atomic SETNX, TTL expiration | **PA/EL (Availability & Latency over strong consistency)** |
| **MinIO / S3** | Cold telemetry history, Parquet files, daily batch extracts, ML datasets | Low-cost columnar object storage, vectorized DuckDB analytics | **PA/EC (Eventual consistency, high read throughput)** |
| **pgvector** | Policy documentation embeddings, past recommendation explanations | Native co-location with relational database, prevents external vector DB sprawl | **PC/EC (Consistent with relational core)** |

## Consequences
- Every data store has a single clear owner and access pattern.
- High-write streaming data does not degrade transactional OLTP performance.
- Vector search and relational data share a single connection pool and security context.
