# Declarations, Open-Source Licenses & AI Usage Disclosure

In compliance with Hackathon Submission Checklist Item 6:

---

## 1. Open-Source Components & Licenses

| Component | Version | License | Role / Purpose |
| :--- | :--- | :--- | :--- |
| **PostgreSQL** | 16.13 | PostgreSQL License (Permissive) | Primary 3NF Relational Database & ACID Storage Engine |
| **TimescaleDB** | 2.16 | Apache 2.0 / Timescale License | High-Throughput Time-Series Hypertables & Continuous Aggregates |
| **Redpanda Community Edition** | 24.2.7 | Redpanda Community License (BSL/Apache 2.0 wire compat) | Single-node lightweight Kafka API-compatible event broker |
| **Redis** | 7.4 | RSALv2 / SSPL (Alpine Community) | In-memory hot state, deduplication Bloom filter, rate limiting |
| **FastAPI** | 0.111+ | MIT License | High-performance asynchronous REST API framework |
| **Uvicorn** | 0.30+ | BSD-3-Clause | ASGI web server implementation |
| **LightGBM** | 4.3+ | MIT License | Gradient-boosted regressor for expected idle fraction prediction |
| **Scikit-Learn** | 1.4+ | BSD-3-Clause | Machine learning evaluation metrics & Isolation Forest |
| **React** | 18.3+ | MIT License | Single-page executive web dashboard UI |
| **Vite** | 5.2+ | MIT License | Frontend build tool and rapid development server |
| **Lucide React** | 0.383+ | ISC License | Accessible SVG icon collection |
| **Pytest & Pytest-Cov** | 8.2+ / 5.0+ | MIT License | Automated unit testing and line coverage reporting |
| **Behave** | 1.2+ | BSD-2-Clause | BDD Gherkin acceptance testing framework |
| **Pydantic** | 2.7+ | MIT License | Data validation and settings management |
| **Psycopg2-binary** | 2.9+ | LGPL with exception | PostgreSQL Python database adapter |

---

## 2. Artificial Intelligence Tools Disclosure

| AI Tool / Framework | Usage & Purpose |
| :--- | :--- |
| **Antigravity AI Agent** | Used as an assistive pair-programming copilot for code generation, test scaffolding, and system architectural synthesis. |
| **FleetLeak Guarded Copilot (Internal Service)** | Implements a **Hybrid Copilot Architecture**: connects to external LLM APIs (OpenAI / Gemini) if an API key is supplied in `.env`; otherwise operates via the deterministic **Rule-Based Fallback Copilot** (explicitly labeled in the UI, API responses, and audit logs). Both pathways enforce strict tool allow-lists, tenant boundaries, and human-in-the-loop approval. |

---

## 3. Data Authenticity & Synthetic Nature Confirmation
- **Synthetic Data Attestation**: All 100,000+ vehicles, VINs, license plates, geolocations, driver employee numbers, trip profiles, and telemetry sensor values generated and used within FleetLeak are **100% synthetic**.
- **No Real PII or OEM Telemetry**: No real-world commercial vehicle fleets, proprietary OEM internal telematics protocols, or actual human personal data (PII) were accessed, collected, or stored.
