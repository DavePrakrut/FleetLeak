# FleetLeak 3NF Relational Entity-Relationship Diagram

In accordance with Docket Section 6.2 and 6.6, the core schema strictly adheres to Third Normal Form (3NF) with surrogate UUID primary keys, explicit foreign key cascade rules, check constraints, and row-level security.

```mermaid
erDiagram
    TENANT ||--o{ APP_USER : "has"
    TENANT ||--o{ DEPOT : "operates"
    TENANT ||--o{ VEHICLE : "owns"
    TENANT ||--o{ DRIVER : "employs"
    TENANT ||--o{ LEAK_EVENT : "records"
    TENANT ||--o{ RECOMMENDATION : "receives"
    TENANT ||--o{ FUEL_PRICE : "configures"

    APP_USER ||--o{ USER_ROLE : "assigned"
    ROLE ||--o{ USER_ROLE : "grants"

    DEPOT ||--o{ VEHICLE : "bases"
    VEHICLE_CLASS ||--o{ VEHICLE : "classifies"
    OEM_SOURCE ||--o{ VEHICLE : "integrates"

    VEHICLE ||--o{ VEHICLE_ASSIGNMENT : "assigned"
    DRIVER ||--o{ VEHICLE_ASSIGNMENT : "drives"

    VEHICLE ||--o{ LEAK_EVENT : "incurs"
    DEPOT ||--o{ LEAK_EVENT : "locates"
    LEAK_TYPE ||--o{ LEAK_EVENT : "categorizes"

    LEAK_EVENT ||--o{ ALERT : "triggers"
    APP_USER ||--o{ ALERT : "acknowledges"

    RECOMMENDATION ||--o{ RECOMMENDATION_ACTION : "audited_by"
    APP_USER ||--o{ RECOMMENDATION_ACTION : "authorizes"

    TENANT {
        uuid id PK
        varchar code UK
        varchar name
        boolean is_active
        timestamptz created_at
    }

    APP_USER {
        uuid id PK
        uuid tenant_id FK
        varchar email UK
        varchar hashed_password
        varchar full_name
        boolean is_active
    }

    DEPOT {
        uuid id PK
        uuid tenant_id FK
        varchar code
        varchar name
        varchar geohash_7
        float center_lat
        float center_lon
        numeric radius_meters
    }

    VEHICLE_CLASS {
        uuid id PK
        varchar code UK
        varchar propulsion_type
        numeric baseline_burn_rate_lph
        numeric baseline_battery_drain_kw
    }

    VEHICLE {
        uuid id PK
        uuid tenant_id FK
        uuid depot_id FK
        uuid vehicle_class_id FK
        uuid oem_source_id FK
        varchar vin UK
        varchar license_plate
        varchar make
        varchar model
        int year
        numeric daily_lease_cost
        varchar currency
    }

    LEAK_EVENT {
        uuid id PK
        uuid tenant_id FK
        uuid vehicle_id FK
        uuid depot_id FK
        uuid leak_type_id FK
        varchar status
        varchar severity
        timestamptz started_at
        timestamptz ended_at
        int duration_seconds
        numeric fuel_wasted_liters
        numeric estimated_cost_loss
        varchar geohash_5
    }

    RECOMMENDATION {
        uuid id PK
        uuid tenant_id FK
        uuid depot_id FK
        varchar title
        text proposed_action
        numeric projected_monthly_savings
        varchar status
        boolean created_by_agent
    }
```
