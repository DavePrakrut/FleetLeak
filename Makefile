# ==============================================================================
# FleetLeak Automation & CI/CD Makefile
# ==============================================================================

.PHONY: help install up down seed test test-unit test-bdd test-integration bench ml lint clean

help:
	@echo "FleetLeak Commands:"
	@echo "  make install    - Install Python and Node dependencies"
	@echo "  make up         - Start Redpanda, PostgreSQL, Redis, API & Web UI via Docker Compose"
	@echo "  make seed       - Seed 100,000 vehicles, 20 tenants, and 7-day history aggregates"
	@echo "  make test       - Run all test suites (Unit 80%+, Integration, BDD 5 scenarios)"
	@echo "  make bench      - Run high-throughput load benchmark (events/s, p95/p99 latency)"
	@echo "  make ml         - Train & evaluate LightGBM model vs Fixed Rule Baseline"
	@echo "  make down       - Tear down Docker containers and prune networks"

install:
	pip install -r requirements.txt
	cd web && npm install

up:
	docker compose up -d --build

down:
	docker compose down -v

seed:
	python -m services.simulator.seed_pack --clean --vehicles 100000 --tenants 20

test-unit:
	python -m pytest tests/unit --cov=services --cov-report=term-missing

test-bdd:
	python -m behave tests/bdd

test-integration:
	python -m tests.integration.test_api_endpoints

test-security:
	python -m tests.security.test_agent_guardrails

test-chaos:
	python -m tests.chaos.chaos_kill_test

test: test-unit test-bdd test-integration test-security test-chaos
	@echo "All 5 Test Suites Passed Successfully!"

bench:
	python -m tests.load.benchmark_load

ml:
	python -m services.ml.model

clean:
	python -m services.simulator.seed_pack --clean --vehicles 1000 --tenants 5
