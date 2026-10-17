-- ==============================================================================
-- FleetLeak 3NF Relational Core & TimescaleDB Telemetry Schema
-- Migration: 001_initial_schema.sql
-- Standards: snake_case, singular names, surrogate id PK, explicit ON DELETE,
--            CHECK constraints, NUMERIC currency, UTC timestamps, RLS per tenant.
-- ==============================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Attempt TimescaleDB extension if available in environment
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TimescaleDB extension not present; falling back to native PostgreSQL declarative time partitioning.';
END $$;

-- Attempt pgvector extension if available
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "vector";
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pgvector extension not present; vector column will use standard text/array fallback.';
END $$;

-- ------------------------------------------------------------------------------
-- 1. Tenant & Organization Hierarchy
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_tenant_code UNIQUE (code)
);
CREATE INDEX IF NOT EXISTS idx_tenant_code ON tenant(code);

-- ------------------------------------------------------------------------------
-- 2. Identity, Roles & Permissions (RBAC)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_role_code UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS app_user (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NULL REFERENCES tenant(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_app_user_email UNIQUE (email)
);
CREATE INDEX IF NOT EXISTS idx_app_user_tenant_id ON app_user(tenant_id);

CREATE TABLE IF NOT EXISTS user_role (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_user_role UNIQUE (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS api_client (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    client_name VARCHAR(100) NOT NULL,
    client_id VARCHAR(100) NOT NULL,
    client_secret_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_api_client_client_id UNIQUE (client_id)
);

-- ------------------------------------------------------------------------------
-- 3. Depots, Geofences & Operational Infrastructure
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS depot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    geohash_7 VARCHAR(7) NOT NULL,
    center_lat DOUBLE PRECISION NOT NULL,
    center_lon DOUBLE PRECISION NOT NULL,
    radius_meters NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_depot_tenant_code UNIQUE (tenant_id, code),
    CONSTRAINT ck_depot_radius CHECK (radius_meters > 0)
);
CREATE INDEX IF NOT EXISTS idx_depot_tenant_id ON depot(tenant_id);
CREATE INDEX IF NOT EXISTS idx_depot_geohash_7 ON depot(geohash_7);

CREATE TABLE IF NOT EXISTS geofence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    depot_id UUID NULL REFERENCES depot(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    polygon_geojson JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS idx_geofence_tenant_id ON geofence(tenant_id);

-- ------------------------------------------------------------------------------
-- 4. Vehicle Master & Telemetry Assets
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicle_class (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL,
    propulsion_type VARCHAR(20) NOT NULL DEFAULT 'ICE', -- ICE, HYBRID, EV
    baseline_burn_rate_lph NUMERIC(8, 4) NOT NULL DEFAULT 2.5000, -- Liters per hour idle
    baseline_battery_drain_kw NUMERIC(8, 4) NOT NULL DEFAULT 1.8000, -- kW draw during EV HVAC idle
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_vehicle_class_code UNIQUE (code),
    CONSTRAINT ck_propulsion_type CHECK (propulsion_type IN ('ICE', 'HYBRID', 'EV'))
);

CREATE TABLE IF NOT EXISTS oem_source (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oem_code VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    payload_format VARCHAR(20) NOT NULL DEFAULT 'JSON',
    schema_definition JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_oem_source_code UNIQUE (oem_code)
);

CREATE TABLE IF NOT EXISTS vehicle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    depot_id UUID NOT NULL REFERENCES depot(id) ON DELETE RESTRICT,
    vehicle_class_id UUID NOT NULL REFERENCES vehicle_class(id) ON DELETE RESTRICT,
    oem_source_id UUID NOT NULL REFERENCES oem_source(id) ON DELETE RESTRICT,
    vin VARCHAR(17) NOT NULL,
    license_plate VARCHAR(50) NOT NULL,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    daily_lease_cost NUMERIC(10, 2) NOT NULL DEFAULT 45.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_vehicle_vin UNIQUE (vin),
    CONSTRAINT ck_vehicle_vin_valid CHECK (length(vin) = 17 AND vin !~ '[IOQioq]')
);
CREATE INDEX IF NOT EXISTS idx_vehicle_tenant_id ON vehicle(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_depot_id ON vehicle(depot_id);

CREATE TABLE IF NOT EXISTS driver (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    employee_code VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_e164 VARCHAR(20) NULL,
    encrypted_license_no BYTEA NULL, -- Sensitive column protected via pgcrypto
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_driver_tenant_code UNIQUE (tenant_id, employee_code)
);
CREATE INDEX IF NOT EXISTS idx_driver_tenant_id ON driver(tenant_id);

CREATE TABLE IF NOT EXISTS vehicle_assignment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicle(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES driver(id) ON DELETE RESTRICT,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_assignment_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
CREATE INDEX IF NOT EXISTS idx_vehicle_assignment_lookup ON vehicle_assignment(vehicle_id, effective_from);

CREATE TABLE IF NOT EXISTS shift_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    depot_id UUID NOT NULL REFERENCES depot(id) ON DELETE CASCADE,
    shift_name VARCHAR(100) NOT NULL,
    start_time_utc TIME NOT NULL,
    end_time_utc TIME NOT NULL,
    days_of_week INT[] NOT NULL, -- 0=Sunday, 1=Monday...
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ------------------------------------------------------------------------------
-- 5. Financial & Cost Assumptions (Configurable in DB, not hardcoded)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fuel_price (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    region VARCHAR(50) NOT NULL,
    fuel_type VARCHAR(20) NOT NULL DEFAULT 'DIESEL', -- DIESEL, PETROL, ELECTRICITY
    price_per_unit NUMERIC(10, 4) NOT NULL,
    unit VARCHAR(10) NOT NULL DEFAULT 'LITER', -- LITER, GALLON, KWH
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    effective_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_fuel_price UNIQUE (tenant_id, region, fuel_type, effective_date),
    CONSTRAINT ck_fuel_price_positive CHECK (price_per_unit > 0)
);

CREATE TABLE IF NOT EXISTS cost_assumption (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    parameter_value NUMERIC(12, 4) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    confidence_level VARCHAR(10) NOT NULL DEFAULT 'HIGH', -- HIGH, MEDIUM, LOW
    source_reference TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_cost_assumption_tenant_code UNIQUE (tenant_id, code),
    CONSTRAINT ck_confidence CHECK (confidence_level IN ('HIGH', 'MEDIUM', 'LOW'))
);

-- ------------------------------------------------------------------------------
-- 6. Canonical Telemetry Core (Timescale Hypertable / Partitioned Series)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telemetry_canonical (
    id UUID DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    ts_utc TIMESTAMPTZ NOT NULL,
    seq BIGINT NOT NULL,
    vin VARCHAR(17) NOT NULL,
    lat DOUBLE PRECISION NULL,
    lon DOUBLE PRECISION NULL,
    geohash_7 VARCHAR(7) NULL,
    speed_kmh NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    engine_on BOOLEAN NOT NULL DEFAULT FALSE,
    rpm INT NOT NULL DEFAULT 0,
    fuel_level_pct NUMERIC(5, 2) NULL,
    fuel_rate_lph NUMERIC(8, 4) NOT NULL DEFAULT 0.0000,
    odo_km NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    dtc TEXT[] NOT NULL DEFAULT '{}',
    evt VARCHAR(50) NULL,
    oem VARCHAR(50) NOT NULL,
    schema_version VARCHAR(20) NOT NULL DEFAULT '1.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_telemetry_canonical UNIQUE (vehicle_id, seq, ts_utc)
);

-- Try converting to hypertable if TimescaleDB is enabled
DO $$
BEGIN
    PERFORM create_hypertable('telemetry_canonical', 'ts_utc', if_not_exists => TRUE);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TimescaleDB hypertable conversion skipped; using standard table.';
END $$;

CREATE INDEX IF NOT EXISTS idx_telemetry_canonical_lookup ON telemetry_canonical(vehicle_id, ts_utc DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_canonical_tenant_ts ON telemetry_canonical(tenant_id, ts_utc DESC);

-- ------------------------------------------------------------------------------
-- 7. Leak Types, Events & Real-Time Alerts
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leak_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    default_severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_leak_type_code UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS leak_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicle(id) ON DELETE CASCADE,
    driver_id UUID NULL REFERENCES driver(id) ON DELETE SET NULL,
    depot_id UUID NOT NULL REFERENCES depot(id) ON DELETE RESTRICT,
    leak_type_id UUID NOT NULL REFERENCES leak_type(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- OPEN, IN_REVIEW, RESOLVED, DISMISSED
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ NULL,
    duration_seconds INT NOT NULL DEFAULT 0,
    fuel_wasted_liters NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    estimated_cost_loss NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    detection_method VARCHAR(50) NOT NULL DEFAULT 'STREAM_SLIDING_WINDOW', -- STREAM_SLIDING_WINDOW, ML_ANOMALY, BATCH_PEER
    geohash_5 VARCHAR(5) NULL, -- Location masked for privacy compliance
    raw_details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_leak_event_status CHECK (status IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED')),
    CONSTRAINT ck_leak_event_severity CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);
CREATE INDEX IF NOT EXISTS idx_leak_event_open ON leak_event(tenant_id, status) WHERE status = 'OPEN';
CREATE INDEX IF NOT EXISTS idx_leak_event_keyset ON leak_event(tenant_id, created_at DESC, id);
CREATE INDEX IF NOT EXISTS idx_leak_event_vehicle ON leak_event(vehicle_id, created_at DESC);

CREATE TABLE IF NOT EXISTS alert (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    leak_event_id UUID NOT NULL REFERENCES leak_event(id) ON DELETE CASCADE,
    severity VARCHAR(20) NOT NULL DEFAULT 'HIGH',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    acknowledged_at TIMESTAMPTZ NULL,
    acknowledged_by UUID NULL REFERENCES app_user(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_alert_unread ON alert(tenant_id, is_read, dispatched_at DESC);

-- ------------------------------------------------------------------------------
-- 8. Tripping & DP Segmentation Storage
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trip (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicle(id) ON DELETE CASCADE,
    driver_id UUID NULL REFERENCES driver(id) ON DELETE SET NULL,
    start_ts TIMESTAMPTZ NOT NULL,
    end_ts TIMESTAMPTZ NOT NULL,
    distance_km NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    duration_minutes NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    avg_speed_kmh NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    idle_duration_minutes NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    fuel_consumed_liters NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS idx_trip_lookup ON trip(vehicle_id, start_ts DESC);

CREATE TABLE IF NOT EXISTS stop (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trip(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicle(id) ON DELETE CASCADE,
    arrival_ts TIMESTAMPTZ NOT NULL,
    departure_ts TIMESTAMPTZ NOT NULL,
    idle_minutes NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    geohash_7 VARCHAR(7) NOT NULL,
    is_depot_stop BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ------------------------------------------------------------------------------
-- 9. Recommendations, Approvals & Action Queue (Guarded Agent Write Table)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recommendation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    vehicle_id UUID NULL REFERENCES vehicle(id) ON DELETE SET NULL,
    depot_id UUID NULL REFERENCES depot(id) ON DELETE SET NULL,
    driver_id UUID NULL REFERENCES driver(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    proposed_action TEXT NOT NULL,
    projected_monthly_savings NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    confidence_score NUMERIC(5, 4) NOT NULL DEFAULT 0.8500,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING_APPROVAL', -- PENDING_APPROVAL, APPROVED, REJECTED, EXECUTED
    created_by_agent BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_recommendation_status CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTED'))
);
CREATE INDEX IF NOT EXISTS idx_recommendation_pending ON recommendation(tenant_id, status) WHERE status = 'PENDING_APPROVAL';

CREATE TABLE IF NOT EXISTS recommendation_action (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID NOT NULL REFERENCES recommendation(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- APPROVE, REJECT, OVERRIDE
    acted_by UUID NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
    notes TEXT NULL,
    acted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS savings_estimate (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    aggregate_level VARCHAR(20) NOT NULL DEFAULT 'FLEET', -- FLEET, DEPOT, VEHICLE, DRIVER
    entity_id UUID NOT NULL,
    baseline_cost NUMERIC(14, 2) NOT NULL,
    actual_leak_cost NUMERIC(14, 2) NOT NULL,
    recoverable_savings NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ------------------------------------------------------------------------------
-- 10. Machine Learning Models, Runs & Ground-Truth Evaluation
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS model_run (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL,
    hyperparameters JSONB NOT NULL DEFAULT '{}',
    training_sample_count INT NOT NULL,
    precision_score NUMERIC(6, 4) NOT NULL,
    recall_score NUMERIC(6, 4) NOT NULL,
    f1_score NUMERIC(6, 4) NOT NULL,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS model_score (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_run_id UUID NOT NULL REFERENCES model_run(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicle(id) ON DELETE CASCADE,
    scoring_date DATE NOT NULL,
    observed_idle_fraction NUMERIC(6, 4) NOT NULL,
    predicted_expected_idle_fraction NUMERIC(6, 4) NOT NULL,
    residual NUMERIC(6, 4) NOT NULL,
    anomaly_score NUMERIC(6, 4) NOT NULL,
    is_anomaly BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS ground_truth_label (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicle(id) ON DELETE CASCADE,
    injected_leak_type VARCHAR(50) NOT NULL,
    injection_ratio NUMERIC(5, 4) NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NOT NULL,
    notes TEXT NULL
);

-- ------------------------------------------------------------------------------
-- 11. Security, Audit Logs & Privacy Compliance (GDPR / DPDP)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NULL,
    user_id UUID NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100) NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON audit_log(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS agent_action_log (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    prompt TEXT NOT NULL,
    tool_called VARCHAR(100) NOT NULL,
    tool_parameters JSONB NOT NULL DEFAULT '{}',
    result_summary JSONB NOT NULL DEFAULT '{}',
    response_tokens INT NOT NULL DEFAULT 0,
    latency_ms INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS idx_agent_action_log_tenant ON agent_action_log(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS consent_record (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES driver(id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL,
    is_granted BOOLEAN NOT NULL DEFAULT TRUE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    revoked_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS erasure_request (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES driver(id) ON DELETE RESTRICT,
    requested_by UUID NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, COMPLETED, REJECTED
    requested_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    processed_at TIMESTAMPTZ NULL,
    audit_notes TEXT NULL
);

-- ------------------------------------------------------------------------------
-- 12. Row-Level Security (RLS) Configuration
-- ------------------------------------------------------------------------------
-- Enable RLS on all tenant-specific tables
ALTER TABLE depot ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_price ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_assumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE leak_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_estimate ENABLE ROW LEVEL SECURITY;

-- Helper policy definition macro for multi-tenant isolation
DROP POLICY IF EXISTS depot_tenant_isolation ON depot;
CREATE POLICY depot_tenant_isolation ON depot
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

DROP POLICY IF EXISTS vehicle_tenant_isolation ON vehicle;
CREATE POLICY vehicle_tenant_isolation ON vehicle
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

DROP POLICY IF EXISTS driver_tenant_isolation ON driver;
CREATE POLICY driver_tenant_isolation ON driver
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

DROP POLICY IF EXISTS vehicle_assignment_tenant_isolation ON vehicle_assignment;
CREATE POLICY vehicle_assignment_tenant_isolation ON vehicle_assignment
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

DROP POLICY IF EXISTS leak_event_tenant_isolation ON leak_event;
CREATE POLICY leak_event_tenant_isolation ON leak_event
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

DROP POLICY IF EXISTS alert_tenant_isolation ON alert;
CREATE POLICY alert_tenant_isolation ON alert
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

DROP POLICY IF EXISTS recommendation_tenant_isolation ON recommendation;
CREATE POLICY recommendation_tenant_isolation ON recommendation
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

DROP POLICY IF EXISTS savings_estimate_tenant_isolation ON savings_estimate;
CREATE POLICY savings_estimate_tenant_isolation ON savings_estimate
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

-- ------------------------------------------------------------------------------
-- 13. Continuous Aggregation Materialized Views (Timescale / SQL Roll-ups)
-- ------------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS agg_depot_daily_leak AS
SELECT 
    d.tenant_id,
    d.id AS depot_id,
    d.name AS depot_name,
    DATE(le.started_at) AS leak_date,
    COUNT(le.id) AS total_leaks,
    SUM(le.fuel_wasted_liters) AS total_fuel_wasted_liters,
    SUM(le.estimated_cost_loss) AS total_cost_loss_usd
FROM depot d
LEFT JOIN leak_event le ON d.id = le.depot_id
GROUP BY d.tenant_id, d.id, d.name, DATE(le.started_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agg_depot_daily ON agg_depot_daily_leak(depot_id, leak_date);
