# ADR-001: Streaming Broker Choice — Redpanda (Kafka-Compatible Protocol)

## Status
Accepted

## Context
FleetLeak requires ingesting high-throughput real-time telemetry from 100,000+ simulated vehicles generating over 100,000 events/sec at scale, with burst traffic multipliers of 3x.
Requirements:
1. Replayable partitioned log to support multiple consumer groups (ingest-gateway, normalizer, stream-processor, cold-storage archiver).
2. Strict per-vehicle sequential ordering (partition key = `vehicle_id`).
3. Low end-to-end latency (<100ms broker publish + consume).
4. Low resource footprint for local development and edge deployments without requiring 6–8 GB JVM heap overhead or Zookeeper/KRaft coordination overhead on developer laptops.

## Decision
We adopt **Redpanda** as the primary streaming broker, configured in single-node developer mode:
```bash
redpanda start --mode=dev-container --smp=1 --memory=1G --overprovisioned
```

### Critical Compatibility Note
Redpanda is a C++ native, thread-per-core streaming engine that natively implements the **Apache Kafka wire protocol (v2.4 through v3.8)**. 
Because it uses standard Kafka APIs, all client libraries in FleetLeak use standard `confluent-kafka` and Kafka consumer/producer interfaces. **Zero application code changes** are required to swap between Redpanda and Apache Kafka (or AWS MSK / Confluent Cloud).

## Alternatives Considered
- **RabbitMQ**: AMQP queue model lacks native log replayability, partitioned order per vehicle across horizontal consumers, and historical offset seek needed for ML training re-scans.
- **Apache Kafka (JVM / KRaft)**: High memory consumption (JVM heap min 2-4 GB), longer startup times (>45s vs 2s for Redpanda), heavier thermal and CPU overhead on developer hardware.
- **Redis Streams**: High speed, but lacks distributed partition balancing, enterprise ecosystem tools, and standard tiered storage connectors.

## Consequences
- **Positive**: Sub-millisecond p99 latency, under 1 GB memory consumption, 2-second container boot time, zero code lock-in (100% Kafka wire protocol compatible).
- **Negative**: Redpanda advanced clustering features require enterprise licensing in production clusters with tier-2 tiered storage, but standard Kafka APIs and community edition cover all platform requirements.
