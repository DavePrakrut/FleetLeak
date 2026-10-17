-- ==============================================================================
-- FleetLeak Seed Reference Data
-- Migration / Seed: 001_seed_reference_data.sql
-- ==============================================================================

-- 1. Standard Roles
INSERT INTO role (id, code, description) VALUES
('a0000000-0000-0000-0000-000000000001', 'platform_admin', 'Full platform tenant and infrastructure administration'),
('a0000000-0000-0000-0000-000000000002', 'fleet_admin', 'Tenant administrator with policy and user management'),
('a0000000-0000-0000-0000-000000000003', 'fleet_manager', 'Operational and financial fleet supervisor, approves AI recommendations'),
('a0000000-0000-0000-0000-000000000004', 'analyst', 'Read-only business analytics with privacy location masking'),
('a0000000-0000-0000-0000-000000000005', 'depot_supervisor', 'Scoped access to assigned depot operations'),
('a0000000-0000-0000-0000-000000000006', 'agent_service', 'Guarded AI copilot service identity'),
('a0000000-0000-0000-0000-000000000007', 'simulator_device', 'IoT ingestion device certificate role')
ON CONFLICT (code) DO NOTHING;

-- 2. Standard Leak Types
INSERT INTO leak_type (id, code, name, description, default_severity) VALUES
('b0000000-0000-0000-0000-000000000001', 'IDLE_EXCESS', 'Excessive Engine Idling', 'Engine operating at 0 km/h beyond configured allowed threshold', 'HIGH'),
('b0000000-0000-0000-0000-000000000002', 'AFTER_HOURS_USE', 'After-Hours / Geofence Breach', 'Vehicle movement outside scheduled shift or unauthorized territory', 'CRITICAL'),
('b0000000-0000-0000-0000-000000000003', 'LOW_UTILISATION', 'Under-Utilized Asset', 'Vehicle operating below daily minimum distance/hours vs peer group', 'MEDIUM'),
('b0000000-0000-0000-0000-000000000004', 'AGGRESSIVE_FUEL', 'Aggressive Driving Fuel Burn', 'Frequent harsh acceleration, harsh braking and over-speed events', 'MEDIUM')
ON CONFLICT (code) DO NOTHING;

-- 3. Vehicle Classes & Propulsion Physics
INSERT INTO vehicle_class (id, code, description, propulsion_type, baseline_burn_rate_lph, baseline_battery_drain_kw) VALUES
('c0000000-0000-0000-0000-000000000001', 'CLASS_1_VAN', 'Light Duty Courier Cargo Van', 'ICE', 1.8000, 0.0000),
('c0000000-0000-0000-0000-000000000002', 'CLASS_6_MEDIUM', 'Medium Duty Box Delivery Truck', 'ICE', 3.2000, 0.0000),
('c0000000-0000-0000-0000-000000000003', 'CLASS_8_HEAVY', 'Heavy Duty Long-Haul Freight Tractor', 'ICE', 4.5000, 0.0000),
('c0000000-0000-0000-0000-000000000004', 'EV_DELIVERY_VAN', 'Electric Last-Mile Van', 'EV', 0.0000, 2.1000),
('c0000000-0000-0000-0000-000000000005', 'HYBRID_SHUTTLE', 'Hybrid Passenger / Shuttle Van', 'HYBRID', 1.2000, 1.0000)
ON CONFLICT (code) DO NOTHING;

-- 4. OEM Sources & Dynamic Adapter Registrations
INSERT INTO oem_source (id, oem_code, display_name, payload_format, schema_definition) VALUES
('d0000000-0000-0000-0000-000000000001', 'OEM_FORD_PRO', 'Ford Pro Telematics API', 'JSON', '{"lat":"latitude","lon":"longitude","speed_mph":"speed","engine_state":"ignition","fuel_rate_gph":"fuel_flow"}'),
('d0000000-0000-0000-0000-000000000002', 'OEM_FREIGHTLINER', 'Daimler Truck Connect', 'JSON', '{"pos_lat":"deg","pos_long":"deg","v_kmh":"speed","eng_running":"flag","inst_fuel_lph":"consumption"}'),
('d0000000-0000-0000-0000-000000000003', 'OEM_GEOTAB', 'Geotab MyGeotab Feed', 'JSON', '{"Latitude":"y","Longitude":"x","Speed":"kmh","Ignition":"status","TripOdometer":"km"}'),
('d0000000-0000-0000-0000-000000000004', 'OEM_VOLVO_DYNAMIC', 'Volvo Connect Telematics (Live Onboarding Demo)', 'JSON', '{"gps_latitude":"lat","gps_longitude":"lon","chassis_speed_kph":"spd","engine_status":"on_off"}')
ON CONFLICT (oem_code) DO NOTHING;

-- 5. Primary Test Tenants
INSERT INTO tenant (id, code, name) VALUES
('11111111-1111-1111-1111-111111111111', 'TENANT_APEX_LOGISTICS', 'Apex Logistics North America'),
('22222222-2222-2222-2222-222222222222', 'TENANT_METRO_FREIGHT', 'Metro Freight Systems India'),
('33333333-3333-3333-3333-333333333333', 'TENANT_EURO_HAULAGE', 'Euro Haulage BV')
ON CONFLICT (code) DO NOTHING;

-- 6. Seed App Users
-- Passwords hashed with bcrypt: "Password123!" -> $2b$12$e8Y4Vn4zZ73j25i038XvcuK.iG2156O80.c.k.M/3D.3B.e.e.
INSERT INTO app_user (id, tenant_id, email, hashed_password, full_name) VALUES
('f0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'finance@apexlogistics.com', '$2b$12$g9l8y4Jt9z06L72i038XvcuK.iG2156O80.c.k.M/3D.3B.e.e.', 'Elena Rostova (Fleet Finance Manager)'),
('f0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'ops@apexlogistics.com', '$2b$12$g9l8y4Jt9z06L72i038XvcuK.iG2156O80.c.k.M/3D.3B.e.e.', 'Marcus Vance (Operations Dispatcher)'),
('f0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'analyst@apexlogistics.com', '$2b$12$g9l8y4Jt9z06L72i038XvcuK.iG2156O80.c.k.M/3D.3B.e.e.', 'Sara Chen (Financial Analyst)')
ON CONFLICT (email) DO NOTHING;

-- Assign User Roles
INSERT INTO user_role (user_id, role_id) VALUES
('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003'), -- fleet_manager
('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002'), -- fleet_admin
('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004')  -- analyst
ON CONFLICT DO NOTHING;

-- 7. Seed Operational Depots with Geohashes
INSERT INTO depot (id, tenant_id, code, name, geohash_7, center_lat, center_lon, radius_meters) VALUES
('e0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'DEPOT_ORD_CHICAGO', 'Chicago Central O-Hare Hub', 'dp3wm0t', 41.974162, -87.907321, 800.00),
('e0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'DEPOT_DFW_DALLAS', 'Dallas-Fort Worth Metro Depot', '9vg4e8h', 32.899809, -97.040335, 750.00),
('e0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'DEPOT_EWR_NEWARK', 'Newark Tri-State Terminal', 'dr5rf92', 40.689531, -74.174463, 600.00)
ON CONFLICT DO NOTHING;

-- 8. Seed Cost Assumptions (Stored in DB, Configurable)
INSERT INTO cost_assumption (tenant_id, code, description, parameter_value, unit, confidence_level, source_reference) VALUES
('11111111-1111-1111-1111-111111111111', 'MAX_ALLOWED_IDLE_MIN', 'Allowed non-revenue idling threshold per stop before flag', 5.0000, 'MINUTES', 'HIGH', 'Docket Section 2.1 & EPA SmartWay Guideline'),
('11111111-1111-1111-1111-111111111111', 'DIESEL_BURN_RATE_LPH', 'Average Class 8 diesel engine idle consumption', 3.8000, 'LITERS_PER_HOUR', 'HIGH', 'Argonne National Laboratory Idle Fuel Consumption Study'),
('11111111-1111-1111-1111-111111111111', 'MIN_DAILY_UTILISATION_KM', 'Minimum required active operating distance per shift', 45.0000, 'KM_PER_DAY', 'MEDIUM', 'Apex Logistics Internal Operational Policy 2026'),
('11111111-1111-1111-1111-111111111111', 'AVERAGE_ASSET_LEASE_COST', 'Daily opportunity amortization cost for unutilized vehicle', 55.0000, 'USD_PER_DAY', 'HIGH', 'Penske Fleet Commercial Master Lease Agreement 2025-2027')
ON CONFLICT DO NOTHING;

-- 9. Seed Regional Fuel Prices (Effective-dated)
INSERT INTO fuel_price (tenant_id, region, fuel_type, price_per_unit, unit, currency, effective_date) VALUES
('11111111-1111-1111-1111-111111111111', 'US_MIDWEST', 'DIESEL', 1.1500, 'LITER', 'USD', '2026-10-01'),
('11111111-1111-1111-1111-111111111111', 'US_SOUTH', 'DIESEL', 1.0800, 'LITER', 'USD', '2026-10-01'),
('11111111-1111-1111-1111-111111111111', 'US_NORTHEAST', 'DIESEL', 1.2800, 'LITER', 'USD', '2026-10-01')
ON CONFLICT DO NOTHING;
