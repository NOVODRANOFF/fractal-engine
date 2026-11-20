// Enterprise Multi-Horizon Cost & TCO Forecasting Engine
const { AWS_REGIONS, EC2_CATALOG, AWS_SERVICE_PRICING } = require('./awsPriceCatalog');

class CostProjector {
  /**
   * Projects enterprise infrastructure costs across 1 week, 2 weeks, 1 month, and 3 months,
   * factoring in regional coefficients, compound data/backup growth, and enterprise SLA protections.
   */
  static projectCosts(params) {
    const {
      regionCode = 'eu-central-1',
      instanceSku = 'm7g-xlarge',
      modules = {},
      storageGb = 80,
      monthlyDataTransferGb = 250
    } = params;

    const region = AWS_REGIONS.find(r => r.code === regionCode) || AWS_REGIONS[0];
    const regionalFactor = region.multiplier || 1.0;

    const instance = EC2_CATALOG.find(i => i.sku === instanceSku || i.instanceType === instanceSku) || EC2_CATALOG.find(i => i.sku === 'm7g-xlarge');

    // Planning horizons
    const horizons = [
      { id: '1_week', label: '1 Week', hours: 168, factorOfMo: 168 / 730, snapshotCount: 2, growthMultiplier: 1.00 },
      { id: '2_weeks', label: '2 Weeks', hours: 336, factorOfMo: 336 / 730, snapshotCount: 4, growthMultiplier: 1.05 },
      { id: '1_month', label: '1 Month', hours: 730, factorOfMo: 1.00, snapshotCount: 8, growthMultiplier: 1.15 },
      { id: '3_months', label: '3 Months', hours: 2190, factorOfMo: 3.00, snapshotCount: 24, growthMultiplier: 1.45 }
    ];

    const results = {};

    horizons.forEach(h => {
      // 1. Primary Dedicated Compute (EC2)
      const ec2OnDemand = instance.hourlyUsd * regionalFactor * h.hours;
      const ec2SavingsPlan = instance.savingsPlan1YrUsd * regionalFactor * h.hours;

      // 2. High-Performance Storage (EBS gp3 + Automated Snapshots)
      const effectiveStorageGb = storageGb * h.growthMultiplier;
      const ebsMonthly = effectiveStorageGb * AWS_SERVICE_PRICING.ebs_gp3_per_gb_month * regionalFactor;
      const snapshotsCost = (h.snapshotCount * (storageGb * 0.20)) * AWS_SERVICE_PRICING.ebs_snapshot_per_gb_month * h.factorOfMo * regionalFactor;
      const totalStorage = (ebsMonthly * h.factorOfMo) + snapshotsCost;

      // 3. Network Egress & Edge Distribution
      const transferGb = (monthlyDataTransferGb * h.factorOfMo) * h.growthMultiplier;
      const networkCost = transferGb * AWS_SERVICE_PRICING.cloudfront_per_gb_out * regionalFactor;

      // 4. Strategic Enterprise Companion Modules
      let managedCost = 0;
      const itemizedServices = [];

      // Application Load Balancer
      if (modules.alb) {
        const albTotal = (AWS_SERVICE_PRICING.alb_hourly + (AWS_SERVICE_PRICING.alb_lcu_hourly * 2)) * regionalFactor * h.hours;
        managedCost += albTotal;
        itemizedServices.push({ name: 'Application Load Balancer (ALB)', cost: Math.round(albTotal * 100) / 100 });
      }

      // Aurora PostgreSQL Multi-AZ Database
      if (modules.rds) {
        const rdsHourly = instance.memoryGib >= 16 
          ? AWS_SERVICE_PRICING.rds_aurora_postgres_xlarge_hourly 
          : AWS_SERVICE_PRICING.rds_aurora_postgres_large_hourly;
        const rdsTotal = rdsHourly * regionalFactor * h.hours;
        managedCost += rdsTotal;
        itemizedServices.push({ name: 'Amazon Aurora Multi-AZ Database', cost: Math.round(rdsTotal * 100) / 100 });
      }

      // In-Memory Redis Cluster
      if (modules.elasticache) {
        const redisTotal = AWS_SERVICE_PRICING.elasticache_redis_cluster_hourly * regionalFactor * h.hours;
        managedCost += redisTotal;
        itemizedServices.push({ name: 'Amazon ElastiCache Redis Cluster', cost: Math.round(redisTotal * 100) / 100 });
      }

      // S3 Storage & CloudFront Edge Distribution
      if (modules.s3_and_cloudfront) {
        const s3Total = (40 * h.growthMultiplier) * AWS_SERVICE_PRICING.s3_standard_per_gb_month * h.factorOfMo;
        managedCost += s3Total;
        itemizedServices.push({ name: 'CloudFront Edge & S3 Storage', cost: Math.round(s3Total * 100) / 100 });
      }

      // AWS WAF & Shield Perimeter Security
      if (modules.waf_shield) {
        const wafBase = (AWS_SERVICE_PRICING.waf_monthly_acl + (AWS_SERVICE_PRICING.waf_per_rule_monthly * 3)) * h.factorOfMo;
        const wafRequests = (transferGb * 2500 / 1e6) * AWS_SERVICE_PRICING.waf_per_million_requests;
        const wafTotal = wafBase + wafRequests;
        managedCost += wafTotal;
        itemizedServices.push({ name: 'AWS WAF & Shield Security Perimeter', cost: Math.round(wafTotal * 100) / 100 });
      }

      // AWS Managed NAT Gateway & PrivateLink
      if (modules.nat_gateway) {
        const natBase = AWS_SERVICE_PRICING.nat_gateway_hourly * regionalFactor * h.hours;
        const natData = (transferGb * 0.4) * AWS_SERVICE_PRICING.nat_gateway_per_gb * regionalFactor;
        const natTotal = natBase + natData;
        managedCost += natTotal;
        itemizedServices.push({ name: 'AWS NAT Gateway & Zero-Trust PrivateLink', cost: Math.round(natTotal * 100) / 100 });
      }

      // CloudWatch Observability & Tracing APM Suite
      if (modules.cloudwatch_xray) {
        const cwTotal = (AWS_SERVICE_PRICING.cloudwatch_base_monthly * h.factorOfMo) + ((transferGb * 0.05) * AWS_SERVICE_PRICING.cloudwatch_logs_per_gb);
        managedCost += cwTotal;
        itemizedServices.push({ name: 'CloudWatch & X-Ray Observability Suite', cost: Math.round(cwTotal * 100) / 100 });
      }

      // AWS Backup Automated Governance Vault
      if (modules.aws_backup) {
        const backupTotal = (effectiveStorageGb * AWS_SERVICE_PRICING.aws_backup_per_gb_month * h.factorOfMo) + (AWS_SERVICE_PRICING.aws_backup_vault_compliance_monthly * h.factorOfMo);
        managedCost += backupTotal;
        itemizedServices.push({ name: 'AWS Backup Enterprise Governance Vault', cost: Math.round(backupTotal * 100) / 100 });
      }

      // Aggregations
      const totalOnDemand = ec2OnDemand + totalStorage + networkCost + managedCost;
      const totalSavingsPlan = ec2SavingsPlan + totalStorage + networkCost + managedCost;
      const netSavingsUsd = totalOnDemand - totalSavingsPlan;
      const savingsPercent = Math.round((netSavingsUsd / totalOnDemand) * 100);

      results[h.id] = {
        label: h.label,
        hours: h.hours,
        summary: {
          totalOnDemandUsd: Math.round(totalOnDemand * 100) / 100,
          totalSavingsPlanUsd: Math.round(totalSavingsPlan * 100) / 100,
          netSavingsUsd: Math.round(netSavingsUsd * 100) / 100,
          savingsPercent
        },
        breakdown: {
          compute: Math.round(ec2OnDemand * 100) / 100,
          storage: Math.round(totalStorage * 100) / 100,
          network: Math.round(networkCost * 100) / 100,
          managedServices: Math.round(managedCost * 100) / 100
        },
        itemizedServices
      };
    });

    return {
      region,
      instance,
      projections: results
    };
  }
}

module.exports = CostProjector;
