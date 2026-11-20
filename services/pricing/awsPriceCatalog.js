// AWS Pricing Catalog & Regional Service Matrix
// Comprehensive Enterprise AWS Suite with Synchronized Rates

const AWS_REGIONS = [
  {
    code: 'eu-central-1',
    name: 'Europe (Frankfurt)',
    flag: 'DE',
    lat: 50.1109,
    lon: 8.6821,
    multiplier: 1.05
  },
  {
    code: 'eu-west-1',
    name: 'Europe (Ireland)',
    flag: 'IE',
    lat: 53.3498,
    lon: -6.2603,
    multiplier: 1.02
  },
  {
    code: 'us-east-1',
    name: 'US East (N. Virginia)',
    flag: 'US',
    lat: 38.0336,
    lon: -78.5080,
    multiplier: 1.00
  },
  {
    code: 'us-west-2',
    name: 'US West (Oregon)',
    flag: 'US',
    lat: 45.5152,
    lon: -122.6784,
    multiplier: 1.00
  },
  {
    code: 'ap-northeast-1',
    name: 'Asia Pacific (Tokyo)',
    flag: 'JP',
    lat: 35.6762,
    lon: 139.6503,
    multiplier: 1.12
  }
];

const EC2_CATALOG = [
  // --- Burstable Instances (Baseline throttled) ---
  {
    sku: 't3-micro',
    family: 't3',
    instanceType: 't3.micro',
    vcpu: 2,
    memoryGib: 1.0,
    arch: 'x86_64',
    cpuType: 'Intel Xeon Scalable',
    burstable: true,
    baselineCpuPercent: 10,
    networkPerf: 'Up to 5 Gbps',
    hourlyUsd: 0.0104,
    savingsPlan1YrUsd: 0.0073,
    spotUsd: 0.0031,
    category: 'burstable'
  },
  {
    sku: 't3-small',
    family: 't3',
    instanceType: 't3.small',
    vcpu: 2,
    memoryGib: 2.0,
    arch: 'x86_64',
    cpuType: 'Intel Xeon Scalable',
    burstable: true,
    baselineCpuPercent: 20,
    networkPerf: 'Up to 5 Gbps',
    hourlyUsd: 0.0208,
    savingsPlan1YrUsd: 0.0146,
    spotUsd: 0.0062,
    category: 'burstable'
  },
  {
    sku: 't3-medium',
    family: 't3',
    instanceType: 't3.medium',
    vcpu: 2,
    memoryGib: 4.0,
    arch: 'x86_64',
    cpuType: 'Intel Xeon Scalable',
    burstable: true,
    baselineCpuPercent: 20,
    networkPerf: 'Up to 5 Gbps',
    hourlyUsd: 0.0416,
    savingsPlan1YrUsd: 0.0291,
    spotUsd: 0.0125,
    category: 'burstable'
  },
  {
    sku: 't4g-medium',
    family: 't4g',
    instanceType: 't4g.medium',
    vcpu: 2,
    memoryGib: 4.0,
    arch: 'arm64',
    cpuType: 'AWS Graviton2',
    burstable: true,
    baselineCpuPercent: 20,
    networkPerf: 'Up to 5 Gbps',
    hourlyUsd: 0.0336,
    savingsPlan1YrUsd: 0.0235,
    spotUsd: 0.0101,
    category: 'burstable'
  },
  // --- Enterprise Dedicated Compute (Graviton 3 & Intel Xeon) ---
  {
    sku: 'm7g-large',
    family: 'm7g',
    instanceType: 'm7g.large',
    vcpu: 2,
    memoryGib: 8.0,
    arch: 'arm64',
    cpuType: 'AWS Graviton3',
    burstable: false,
    baselineCpuPercent: 100,
    networkPerf: 'Up to 12.5 Gbps',
    hourlyUsd: 0.1016,
    savingsPlan1YrUsd: 0.0691,
    spotUsd: 0.0365,
    category: 'general_purpose'
  },
  {
    sku: 'm7g-xlarge',
    family: 'm7g',
    instanceType: 'm7g.xlarge',
    vcpu: 4,
    memoryGib: 16.0,
    arch: 'arm64',
    cpuType: 'AWS Graviton3',
    burstable: false,
    baselineCpuPercent: 100,
    networkPerf: 'Up to 12.5 Gbps',
    hourlyUsd: 0.2032,
    savingsPlan1YrUsd: 0.1382,
    spotUsd: 0.0731,
    category: 'general_purpose'
  },
  {
    sku: 'm7g-2xlarge',
    family: 'm7g',
    instanceType: 'm7g.2xlarge',
    vcpu: 8,
    memoryGib: 32.0,
    arch: 'arm64',
    cpuType: 'AWS Graviton3',
    burstable: false,
    baselineCpuPercent: 100,
    networkPerf: 'Up to 15 Gbps',
    hourlyUsd: 0.4064,
    savingsPlan1YrUsd: 0.2764,
    spotUsd: 0.1462,
    category: 'general_purpose'
  },
  {
    sku: 'c7g-xlarge',
    family: 'c7g',
    instanceType: 'c7g.xlarge',
    vcpu: 4,
    memoryGib: 8.0,
    arch: 'arm64',
    cpuType: 'AWS Graviton3',
    burstable: false,
    baselineCpuPercent: 100,
    networkPerf: 'Up to 12.5 Gbps',
    hourlyUsd: 0.1726,
    savingsPlan1YrUsd: 0.1174,
    spotUsd: 0.0620,
    category: 'compute_optimized'
  },
  {
    sku: 'c7g-2xlarge',
    family: 'c7g',
    instanceType: 'c7g.2xlarge',
    vcpu: 8,
    memoryGib: 16.0,
    arch: 'arm64',
    cpuType: 'AWS Graviton3',
    burstable: false,
    baselineCpuPercent: 100,
    networkPerf: 'Up to 15 Gbps',
    hourlyUsd: 0.3452,
    savingsPlan1YrUsd: 0.2347,
    spotUsd: 0.1240,
    category: 'compute_optimized'
  },
  {
    sku: 'r7g-xlarge',
    family: 'r7g',
    instanceType: 'r7g.xlarge',
    vcpu: 4,
    memoryGib: 32.0,
    arch: 'arm64',
    cpuType: 'AWS Graviton3',
    burstable: false,
    baselineCpuPercent: 100,
    networkPerf: 'Up to 12.5 Gbps',
    hourlyUsd: 0.2686,
    savingsPlan1YrUsd: 0.1826,
    spotUsd: 0.0966,
    category: 'memory_optimized'
  },
  {
    sku: 'g5-xlarge',
    family: 'g5',
    instanceType: 'g5.xlarge',
    vcpu: 4,
    memoryGib: 16.0,
    gpu: '1x NVIDIA A10G 24GB',
    arch: 'x86_64',
    cpuType: 'AMD EPYC 7R32',
    burstable: false,
    baselineCpuPercent: 100,
    networkPerf: 'Up to 10 Gbps',
    hourlyUsd: 1.0060,
    savingsPlan1YrUsd: 0.6940,
    spotUsd: 0.4024,
    category: 'gpu'
  }
];

// Comprehensive Enterprise AWS Companion Services Pricing
const AWS_SERVICE_PRICING = {
  // Storage
  ebs_gp3_per_gb_month: 0.08,
  ebs_snapshot_per_gb_month: 0.05,
  s3_standard_per_gb_month: 0.023,

  // Load Balancing & Routing
  alb_hourly: 0.0225,
  alb_lcu_hourly: 0.008,

  // Managed Databases & Caching
  rds_aurora_postgres_large_hourly: 0.240, // Aurora Multi-AZ Enterprise
  rds_aurora_postgres_xlarge_hourly: 0.480,
  elasticache_redis_cluster_hourly: 0.091, // Multi-node clustered Redis

  // Security, Governance & Perimeter Defense
  waf_monthly_acl: 5.00,
  waf_per_rule_monthly: 1.00,
  waf_per_million_requests: 0.60,
  shield_standard_monthly: 0.00, // Baseline included, managed rules accounted

  // Networking, Isolation & Zero-Trust
  nat_gateway_hourly: 0.045,
  nat_gateway_per_gb: 0.045,
  vpc_endpoints_hourly: 0.010,

  // Observability, Audit & APM
  cloudwatch_base_monthly: 15.00, // Detailed metrics + dashboards + alarms
  cloudwatch_logs_per_gb: 0.50,
  xray_traces_per_million: 5.00,

  // Automated Enterprise Backup & Compliance
  aws_backup_per_gb_month: 0.05,
  aws_backup_vault_compliance_monthly: 12.00,

  // CDN & Global Acceleration
  cloudfront_per_gb_out: 0.085,
  data_transfer_out_per_gb: 0.09
};

module.exports = {
  AWS_REGIONS,
  EC2_CATALOG,
  AWS_SERVICE_PRICING
};
