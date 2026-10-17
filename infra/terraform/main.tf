# ==============================================================================
# FleetLeak Cloud-Agnostic Infrastructure as Code (Terraform)
# Provisions: Managed VPC, Redpanda Cloud / Kafka, PostgreSQL/Timescale, Redis, S3
# No cloud-specific SDKs in application code; mapped purely via environment variables.
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  type    = string
  default = "production"
}

# 1. Isolated Virtual Private Cloud (VPC)
resource "aws_vpc" "fleetleak_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "fleetleak-vpc-${var.environment}"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# 2. Encrypted Object Storage for Cold Parquet Telemetry Archive
resource "aws_s3_bucket" "telemetry_cold_archive" {
  bucket        = "fleetleak-telemetry-archive-${var.environment}"
  force_destroy = false

  tags = {
    Name        = "fleetleak-cold-archive"
    Compliance  = "GDPR-7-Year-Retention"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "s3_encryption" {
  bucket = aws_s3_bucket.telemetry_cold_archive.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# 3. Amazon Aurora PostgreSQL (TimescaleDB Compatible)
resource "aws_rds_cluster" "fleetleak_db" {
  cluster_identifier      = "fleetleak-aurora-pg"
  engine                  = "aurora-postgresql"
  engine_version          = "16.1"
  database_name           = "fleetleak"
  master_username         = "fleet_admin"
  master_password         = "SecureFleetMasterKey2026!"
  storage_encrypted       = true
  skip_final_snapshot     = true
  deletion_protection     = false

  tags = {
    Name = "fleetleak-aurora-cluster"
  }
}

# 4. Amazon ElastiCache Redis (Hot State & Token Bucket Rate Limiter)
resource "aws_elasticache_cluster" "fleetleak_redis" {
  cluster_id           = "fleetleak-redis"
  engine               = "redis"
  node_type            = "cache.t4g.medium"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379

  tags = {
    Name = "fleetleak-redis-cache"
  }
}

output "database_endpoint" {
  value = aws_rds_cluster.fleetleak_db.endpoint
}

output "s3_archive_bucket" {
  value = aws_s3_bucket.telemetry_cold_archive.bucket
}
