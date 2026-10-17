Feature: FleetLeak End-to-End Enterprise Compliance & Leak Detection

  Scenario: Excessive dwell idle leak is detected within latency budget
    Given a commercial delivery vehicle "FL-902-TX" assigned to "DEPOT_ORD_CHICAGO"
    When the vehicle engine remains on at 0 km/h for 360 seconds
    Then a leak event of type "IDLE_EXCESS" is generated
    And an alert is published with status "OPEN" and positive financial loss

  Scenario: Duplicate telemetry packet is dropped by two-tier deduplicator
    Given a valid telemetry packet with sequence 4001
    When the same sequence 4001 packet is transmitted again
    Then the deduplicator drops the packet as "DUPLICATE_PACKET"
    And no duplicate row is written to the database

  Scenario: Cross-tenant data retrieval attempt is strictly blocked by RLS
    Given a user belonging to tenant "TENANT_001"
    When the user requests vehicle records belonging to "TENANT_002"
    Then the system refuses access with zero cross-tenant leak

  Scenario: AI Copilot recommendation requires explicit human approval
    Given the guarded AI copilot stages an automatic engine shut-off policy
    When the recommendation is generated
    Then its status must be "PENDING_APPROVAL"
    And the action cannot execute until authorized by a fleet_manager

  Scenario: Driver right-to-erasure GDPR DPDP request initiates data anonymization
    Given an authenticated request to erase driver "DRV-8821"
    When the erasure endpoint is called
    Then an erasure request is registered with status "PENDING"
    And an immutable record is written to the audit log
