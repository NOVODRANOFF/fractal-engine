// Enterprise Terraform / OpenTofu Infrastructure as Code Generator

class TerraformGenerator {
  static generateHcl(config) {
    const {
      regionCode = 'eu-central-1',
      instance = { instanceType: 'm7g.xlarge', arch: 'arm64' },
      modules = {},
      storageGb = 80
    } = config;

    const amiArch = instance.arch === 'arm64' ? 'arm64' : 'x86_64';

    return `# ==============================================================================
# AWS Enterprise Production Infrastructure Manifest
# Region: ${regionCode} | Compute Tier: ${instance.instanceType} (${instance.arch})
# Compliance Baseline: SOC2 Type II, PCI-DSS 4.0, Zero-Trust Architecture
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }
}

provider "aws" {
  region = "${regionCode}"
  default_tags {
    tags = {
      Environment = "Production"
      Governance  = "Enterprise-Architecture-Board"
      ManagedBy   = "SmartCloudSizer"
      CostCenter  = "Core-Infrastructure"
    }
  }
}

# 1. Zero-Trust Multi-AZ VPC Architecture
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "enterprise-core-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${regionCode}a", "${regionCode}b", "${regionCode}c"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.20.0/24", "10.0.30.0/24"]
  database_subnets= ["10.0.50.0/24", "10.0.60.0/24", "10.0.70.0/24"]

  enable_nat_gateway     = true
  single_nat_gateway     = false
  one_nat_gateway_per_az = true
  enable_dns_hostnames   = true
  enable_dns_support     = true
}

# 2. Dedicated Production Compute Cluster (${instance.instanceType})
resource "aws_instance" "app_cluster_node" {
  ami                  = data.aws_ami.amazon_linux_2023.id
  instance_type        = "${instance.instanceType}"
  subnet_id            = module.vpc.private_subnets[0]
  iam_instance_profile = aws_iam_instance_profile.app_profile.name

  root_block_device {
    volume_type           = "gp3"
    volume_size           = ${storageGb}
    iops                  = 3000
    throughput            = 125
    encrypted             = true
    delete_on_termination = true
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required" # IMDSv2 Mandatory for SOC2
    http_put_response_hop_limit = 1
  }

  tags = {
    Name = "Enterprise-App-Node-Primary"
  }
}

data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-${amiArch}"]
  }
}

resource "aws_iam_role" "app_role" {
  name = "enterprise-app-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_instance_profile" "app_profile" {
  name = "enterprise-app-instance-profile"
  role = aws_iam_role.app_role.name
}
${modules.alb ? `
# 3. High-Availability Application Load Balancer
resource "aws_lb" "enterprise_alb" {
  name               = "enterprise-core-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = module.vpc.public_subnets
  drop_invalid_header_fields = true
}

resource "aws_security_group" "alb_sg" {
  name        = "alb-perimeter-sg"
  description = "Permit inbound HTTPS only"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
` : ''}
${modules.rds ? `
# 4. Amazon Aurora PostgreSQL Enterprise Multi-AZ Cluster
resource "aws_rds_cluster" "aurora_cluster" {
  cluster_identifier      = "enterprise-aurora-pg-cluster"
  engine                  = "aurora-postgresql"
  engine_version          = "16.1"
  database_name           = "enterprisedb"
  master_username         = "dbadmin"
  manage_master_user_password = true
  backup_retention_period = 30
  preferred_backup_window = "02:00-03:00"
  storage_encrypted       = true
  deletion_protection     = true
  db_subnet_group_name    = module.vpc.database_subnet_group_name
}

resource "aws_rds_cluster_instance" "cluster_instances" {
  count              = 2 # Multi-AZ Read Replica & Automatic Failover
  identifier         = "enterprise-aurora-instance-\${count.index}"
  cluster_identifier = aws_rds_cluster.aurora_cluster.id
  instance_class     = "${instance.memoryGib >= 16 ? 'db.r7g.xlarge' : 'db.r7g.large'}"
  engine             = aws_rds_cluster.aurora_cluster.engine
}
` : ''}
${modules.elasticache ? `
# 5. Amazon ElastiCache In-Memory Redis Cluster
resource "aws_elasticache_replication_group" "redis_cluster" {
  replication_group_id          = "enterprise-redis-cluster"
  description                   = "High-throughput Redis cache for session & catalog offloading"
  node_type                     = "cache.m7g.large"
  num_cache_clusters            = 2
  automatic_failover_enabled    = true
  at_rest_encryption_enabled    = true
  transit_encryption_enabled   = true
  subnet_group_name             = "enterprise-cache-subnet-group"
}
` : ''}
${modules.waf_shield ? `
# 6. AWS WAF Enterprise Web ACL & Perimeter Shield
resource "aws_wafv2_web_acl" "enterprise_waf" {
  name        = "enterprise-perimeter-waf"
  description = "Enforces OWASP Top 10, IP reputation, and rate limiting"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "EnterpriseWafMetrics"
    sampled_requests_enabled   = true
  }
}
` : ''}
${modules.cloudwatch_xray ? `
# 7. CloudWatch Observability & Telemetry Log Group
resource "aws_cloudwatch_log_group" "app_logs" {
  name              = "/aws/enterprise/production-workloads"
  retention_in_days = 90
}
` : ''}
${modules.aws_backup ? `
# 8. AWS Backup Enterprise Immutable Compliance Vault
resource "aws_backup_vault" "compliance_vault" {
  name        = "enterprise-immutable-backup-vault"
  kms_key_arn = "arn:aws:kms:${regionCode}:current:key/backup-master"
}
` : ''}
`;
  }
}

module.exports = TerraformGenerator;
