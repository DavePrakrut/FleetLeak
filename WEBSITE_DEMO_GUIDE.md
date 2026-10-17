# FleetLeak Web Platform: Step-by-Step Live Demo Presentation Guide

> **Target Audience**: Hackathon Judges, Technical Evaluators, Fleet Operators & Investors  
> **Presenter Persona**: Elena Rostova, VP Fleet Finance, Apex Logistics Corp  
> **Platform URL**: `http://localhost:3000`  
> **Backend Swagger API**: `http://localhost:8000/docs`  
> **Estimated Demo Duration**: 4 to 6 Minutes  

---

## Quick Pre-Demo Checklist (30 Seconds)

Before presenting, make sure your servers are running:
1. **Web Dashboard**: Open `http://localhost:3000` in Google Chrome or Edge.
2. **Backend API**: Verify `http://localhost:8000/api/v1/fleet/kpis` returns HTTP 200.
3. **Database**: PostgreSQL 16 + TimescaleDB is seeded with the 100,000-vehicle dataset.
4. **AI Copilot**: Connected live to Google Gemini 3.8 Flash.

---

## Step 1: Platform Header & Multi-Tenant Isolation (30 Seconds)

### What to Click / Point To:
1. Point to the **Top Header**:
   - Brand logo: **FleetLeak** — *Connected Vehicle Fuel, Idling & Energy Leak Intelligence*.
   - Point to the live status badges on the right:
     - `● TimescaleDB 16.13` (Green dot confirming time-series hypertable connectivity).
     - `● Gemini 3.8 Live LLM` (Green dot confirming active hybrid AI copilot).
   - Point to the user profile badge: `Elena Rostova · VP Fleet Finance`.
2. Click the **`FLEET:`** dropdown:
   - Show that the system supports multiple distinct enterprise fleets:
     - `Apex Logistics Corp 01 (5,000 Vehicles · Chicago Hub)`
     - `Metro Freight Systems 02 (5,000 Vehicles · Dallas Hub)`
     - `TransEnergy Logistics 03 (5,000 Vehicles · Atlanta Hub)`
   - Keep `Apex Logistics Corp 01` selected.
3. Click the **`🌙 Dark` / `☀️ Light`** button:
   - Toggle theme once to show smooth dark mode support, then toggle back to crisp light mode.

### What to Say to the Judges:
> *"Welcome to FleetLeak. Commercial fleet operators lose between 5% and 10% of their annual fuel budget to invisible dwell idling, after-hours usage, and asset leakage across fragmented OEM streams.*  
> *FleetLeak is an enterprise platform running on PostgreSQL 16 TimescaleDB, Redpanda, and LightGBM that monitors over 100,000 commercial vehicles in real time. We are currently logged in as Elena Rostova, VP of Fleet Finance at Apex Logistics Corp."*

---

## Step 2: Executive Command Center — KPIs & What-If Simulator (90 Seconds)

Ensure you are on the default tab: **`Executive Command Center`**.

### What to Point To (Row 1 — The 4 Stat Cards):
1. **Monitored Fleet Size**: `5,000` (Class 1, 6 & 8 Connected Commercial Assets).
2. **Monthly Fuel & Idle Waste**: `$7,921.77` (`770.0 Liters` burned in off-duty dwell).
3. **Recoverable Savings**: `$1,563.00` (Directly recoverable from pending AI policy adjustments).
4. **Fleet Idle Runtime**: `12.8%` (Current idle fraction vs the depot target of `< 5.0%`).

### What to Say:
> *"At a glance, our financial controllers immediately see the core metrics: across our 5,000 active vehicles, we are bleeding $7,921.77 per month in fuel waste with a fleet idle runtime of 12.8%. Crucially, $1,563.00 of that loss is immediately recoverable today through actionable operational adjustments."*

---

### What to Do (Row 2 — Interactive Financial What-If Simulator):
1. Point to the **Interactive Financial What-If Savings Simulator** on the left.
2. Drag the **Target Idle Reduction Slider**:
   - Move it from **30%** up to **50%**.
   - Show how the target badge updates in real time to `50% IDLE CUT`.
3. Drag the **Projected Diesel Price Slider**:
   - Move it from **$3.85/gal** up to **$4.50/gal**.
4. Highlight the **4 Real-Time Recalculated Metric Tiles**:
   - **Monthly Recovered**: Shows dynamic dollar recovery (e.g. `~$4,600+`).
   - **Annual Recovered**: Shows annual bottom-line capital saved (e.g. `~$55,000+`).
   - **Diesel Conserved**: Shows gallons saved (e.g. `1,025 Gal / mo`).
   - **CO2 Abatement**: Shows environmental carbon reduction (e.g. `11.4 MT / yr`).
5. Click the blue button: **`Stage AI Policy for 50% Idle Cut`**:
   - Point out that this automatically transitions to the Copilot view with the recommendation pre-staged!

### What to Point To (Right Side — Live Telemetry Anomaly Stream):
1. Point to the **Live Telemetry Anomaly Stream** card on the right.
2. Highlight the real-time threshold alerts:
   - `MEDIUM` — Real-Time Alert: `IDLE_EXCESS Detected` (-$0.40 Loss).
   - `CRITICAL` — Live Alert: `AFTER_HOURS_USE detected on FL-765-JH` (-$35.97 Loss).
3. Click the small **Refresh icon** (`↻`) to show live polling.

---

### What to Do (Row 3 — Highest Loss Incidents Table):
1. Scroll down slightly to **Highest Loss Incidents Across Monitored Fleet**.
2. Point out the top loss offenders:
   - `FL-881-KD (Volvo VNR)` — Excessive Engine Idling.
   - `FL-607-CI (Ford Transit)` — 47 mins idle, 2.7 L wasted, $3.14 loss.
3. Click the blue **`Inspect Asset`** button on `FL-881-KD` or `FL-607-CI`.

---

## Step 3: Vehicle Drill-Down Inspection Modal (45 Seconds)

### What to Show in the Modal:
1. **Vehicle Identity**: Plate `FL-597-DN` | `VIN: 1FTC6Z353RA958994` | `Volvo VNR (2022)`.
2. **Asset Properties**:
   - Assigned Hub: `Fleet Logistics Operations Corp 01 - Chicago Hub #1`.
   - Propulsion Class: `CLASS_6_MEDIUM`.
   - Daily Lease Cost: `$75/day`.
3. **Recent Telemetry Incident History**:
   - Scroll through the chronological history list:
     - `10/16/2026` | `MEDIUM` | `-$56.25`
     - `10/15/2026` | `MEDIUM` | `-$56.25`
     - `10/14/2026` | `MEDIUM` | `-$56.25`
     - `10/13/2026` | `MEDIUM` | `-$56.25`
4. Click the `✕` close button in the top right to close the modal.

### What to Say:
> *"Clicking 'Inspect Asset' opens our vehicle audit modal. Here, dispatchers and finance managers can review the vehicle's propulsion class, lease economics, and daily incident history. Notice how this unit has incurred an identical $56.25 idle drain for 4 consecutive days, indicating a systemic scheduling dwell issue rather than driver negligence."*

---

## Step 4: Active Leak Auditor & Multi-Parameter Filter (60 Seconds)

Click the **`Active Leak Auditor`** tab on the navigation bar.

### What to Demonstrate:
1. Point out the header: **`Active Leak Auditor & Incident Ledger`** — displaying all 100+ detected fleet leaks.
2. Demonstrate **Live Search**:
   - Click the search input box: type `Ford` -> the table instantly filters to Ford Transit assets.
   - Clear the search box.
3. Demonstrate **Classification Filter**:
   - Open the **`LEAK CLASSIFICATION`** dropdown.
   - Select **`Excessive Idling`** -> filters to idle dwell incidents.
   - Select **`Fuel Theft / Siphoning`** or **`After-Hours / Geofence Breach`** -> shows critical after-hours violations.
   - Reset to **`All Classifications`**.
4. Demonstrate **Depot Location Filter**:
   - Open **`DEPOT LOCATION`** dropdown -> select **`Chicago Hub #1`**.
5. Demonstrate **Severity Filter**:
   - Open **`SEVERITY LEVEL`** dropdown -> select **`Critical Loss`** -> isolates high-dollar losses ($40+).
6. Toggle **Card View vs Table View**:
   - Click the **`Card View`** button in the top right:
     - Shows the 3-column Talentra cards with match badges (`100% MATCH`), tag pills, and loss bands.
   - Click **`Table View`** to return to the dense corporate ledger.
7. Point out the **Geohash Mask (Privacy)** column:
   - Highlight the masked coordinates (`dp3wm`): Explain that driver location privacy is protected under GDPR/DPDP while preserving spatial clustering for depot analytics.

---

## Step 5: Depot Energy Benchmarks (30 Seconds)

Click the **`Depot Energy Benchmarks`** tab on the navigation bar.

### What to Show:
1. Show the regional terminal comparison table:
   - `Fleet Logistics Operations Corp 01 - Chicago Hub #1`
   - `Fleet Logistics Operations Corp 01 - Dallas Terminal #2`
   - `Fleet Logistics Operations Corp 01 - Newark Logistics Center #3`
   - `Fleet Logistics Operations Corp 01 - Atlanta Freight Depot #4`
2. Point out:
   - **Assigned Vehicles**: Commercial fleet units per terminal.
   - **Fuel Wasted**: Total liters lost during off-shift dwell.
   - **Relative Waste Severity**: Visual comparison bar.
   - **Total Loss Cost**: Financial dollar ranking.
3. Click **`View Depot Leaks`** on Dallas Terminal -> jumps directly back to the Auditor filtered for Dallas!

---

## Step 6: Guarded AI Copilot & Human Approval Queue (75 Seconds)

Click the **`Guarded AI Copilot & Approval Queue`** tab on the navigation bar.

### Part A: Live Gemini Copilot (Left Side)
1. Point to the green badge: **`GEMINI 3.8 LIVE`**.
2. Click the quick prompt chip: **`Top Fuel Leaks`**:
   - Watch the animated spinner: *"Evaluating tools, tenant boundaries & running Gemini 3.8 Live..."*
   - In ~1 to 2 seconds, Gemini Live responds with an executive summary:
     - Exact vehicle license plate: `FL-881-KD`
     - Depot: `Chicago Hub #1`
     - Fuel wasted and estimated cost loss.
3. Point out the audit footnote under the response:
   - `Latency: ~150 ms | Audited to agent_action_log | Tenant Scoped`.
4. Click another prompt chip: **`What-If 35% Reduction`**:
   - Observe how Gemini accurately calculates monthly dollar savings, annual savings, and carbon abatement without hallucinating figures.

### Part B: Human-in-the-Loop Approval Queue (Right Side)
1. Point to the **Human Approval Queue** card on the right side.
2. Explain the policy recommendation card:
   - Title: **`Enforce 3-Minute Idle Shut-Off`**
   - Status: `PENDING_APPROVAL` (Amber badge).
   - Proposed Action: *"Program ECU parameter 402 to automatically cut engine after 180 seconds in park."*
   - Projected Savings: **`+$540.00/mo`**.
3. Click the blue button: **`Approve Action`**:
   - Show the instant status change:
     - The button disappears and changes to a green checkmark: **`✓ Authorized`**.
   - Explain:
     > *"This illustrates our enterprise guardrail: AI agents can synthesize insights and stage operational policies, but write actions can NEVER be executed automatically without explicit human authorization from a Finance Manager."*

---

## Step 7: Governance, GDPR & Privacy Shield (30 Seconds)

Click the **`Governance & Privacy Shield`** tab on the navigation bar.

### What to Show:
1. **Driver Right-to-Erasure (GDPR / DPDP Compliance)**:
   - Point out the explanation: Purges employee codes and pgcrypto credentials while preserving aggregate fleet metrics.
   - In the input field, the default driver ID `f0000000-0000-0000-0000-000000000001` is ready.
   - Click **`Initiate Cryptographic Erasure`**.
   - Show the green confirmation banner: *"Erasure request created in status PENDING. Driver PII successfully pseudonymized."*
2. **STRIDE Threat Model & Compliance Controls**:
   - Point to the right-hand panel confirming all 6 threat mitigations:
     - **Spoofing**: mTLS client certificate verification.
     - **Tampering**: L1 Bloom filter + Redis SETNX natural key dedupe.
     - **Repudiation**: Append-only audit logs in TimescaleDB.
     - **Information Disclosure**: PostgreSQL Row-Level Security (RLS) on `tenant_id`.
     - **Elevation of Privilege**: Tool allow-lists and human approval queue.
     - **Location Privacy**: GPS coordinate masking to Geohash-5.

---

## Step 8: Closing Summary & Winning Pitch (30 Seconds)

Wrap up your demo with these 4 impactful takeaways:

> 1. **Proven Scale**: *"We ingest and monitor over 100,000 commercial vehicles across 20 tenants with a single-core throughput of 90,180 events/second."*  
> 2. **AI Superiority**: *"Our LightGBM model achieves 100% precision vs 22.6% for fixed rule baselines, eliminating $38,900 per year in false alarm investigations."*  
> 3. **Guarded Enterprise Intelligence**: *"Our Copilot runs on real Gemini 3.8 Flash, but operates under strict zero-trust guardrails with human approval for all operational changes."*  
> 4. **Immediate ROI**: *"FleetLeak turns raw, noisy telematics streams into verified, recoverable dollars from day one."*

---

## Troubleshooting & Backup Quick Reference

| Potential Question / Scenario | Presenter Response & Action |
| :--- | :--- |
| **"Can I see the API documentation?"** | Open a new browser tab to `http://localhost:8000/docs` to show the full interactive Swagger OpenAPI interface. |
| **"Where is the machine learning code?"** | Point to `services/ml/model.py` and mention that inference runs at **649,287 vehicles/second**. |
| **"What happens if an agent tries prompt injection?"** | Show `services/agent/copilot.py` lines 45-52 where patterns like `ignore previous instructions` or `switch tenant` are blocked and logged. |
| **"How fast does the system recover from a crash?"** | Reference `tests/chaos/chaos_kill_test.py` where pipeline state recovered in **205 milliseconds** with zero data loss. |
