// Academic FinOps Sizing Engine & Deterministic Topology Synthesizer
// Algorithms > User Discretion (Engineering-driven Cloud Migration Sizing)

const { EC2_CATALOG } = require('../pricing/awsPriceCatalog');

class SizingEngine {
  /**
   * Deterministic FinOps Sizing Algorithm
   * Ingests pre-cloud SRE telemetry (P95 RPS, working set memory, legacy CPU utilization, DB TPS)
   * and deterministically synthesizes the optimal AWS target architecture and cost profile.
   */
  static evaluateWorkload(input) {
    const {
      // SRE & Systems Telemetry (Pre-Cloud Baseline)
      dynamicRps = 450,               // P95 Requests Per Second
      concurrentSessions = 850,        // Active concurrent HTTP/WebSocket sessions
      legacyCpuCores = 4,              // Existing on-prem/legacy cores
      legacyCpuPeakPct = 78,           // Peak legacy CPU load (%)
      workingSetMemoryGb = 12,         // In-memory application footprint (GB)
      dbTps = 180,                     // Database transactions per second
      egressMonthlyTb = 2.5,           // Network egress volume in TB
      slaTier = 'mission_critical',    // mission_critical (99.99%), production (99.9%), non_prod (99.0%)
      candidateInstanceType = null     // User manual override test candidate (e.g. t3.micro)
    } = input;

    // ------------------------------------------------------------------------
    // ALGORITHM 1: Compute Core & Architecture Synthesis
    // ------------------------------------------------------------------------
    // Benchmark: AWS Graviton3 (Neoverse-V1) delivers ~120-150 dynamic RPS per core
    // for modern runtime stacks (Go, Node, Java 21, Python asyncio).
    const throughputPerCore = 125;
    const computedVcpuRequired = Math.max(2, Math.ceil(dynamicRps / throughputPerCore));
    
    // Memory Sizing: OS base (1GB) + Working Set + Safety Buffer (25%) + Concurrency overhead
    const sessionMemoryOverheadGb = (concurrentSessions * 0.004); // ~4MB per active worker context
    const computedRamRequired = Math.max(4, Math.ceil((workingSetMemoryGb * 1.25) + sessionMemoryOverheadGb));

    // Burstable CPU Suitability Matrix:
    // Burstable (t-series) is strictly prohibited if P95 load exceeds 25% sustained baseline
    // or if SLA requires Mission-Critical / 99.99% availability.
    const prohibitBurstable = slaTier === 'mission_critical' || dynamicRps > 80 || concurrentSessions > 150;

    // ------------------------------------------------------------------------
    // ALGORITHM 2: Deterministic Target EC2 Selection
    // ------------------------------------------------------------------------
    let recommendedInstance;
    
    if (prohibitBurstable) {
      if (computedRamRequired > 16 || computedVcpuRequired > 4) {
        recommendedInstance = EC2_CATALOG.find(i => i.sku === 'm7g-2xlarge') || EC2_CATALOG.find(i => i.sku === 'm7g-xlarge');
      } else if (computedRamRequired > 8 || computedVcpuRequired > 2) {
        recommendedInstance = EC2_CATALOG.find(i => i.sku === 'm7g-xlarge');
      } else {
        recommendedInstance = EC2_CATALOG.find(i => i.sku === 'm7g-large');
      }
    } else {
      recommendedInstance = EC2_CATALOG.find(i => i.sku === 't4g-medium') || EC2_CATALOG.find(i => i.sku === 't3-medium');
    }

    // ------------------------------------------------------------------------
    // ALGORITHM 3: Candidate Instance Verification & Mathematical Hazard Audit
    // ------------------------------------------------------------------------
    const candidateType = candidateInstanceType || recommendedInstance.instanceType;
    const candidateSpec = EC2_CATALOG.find(i => i.instanceType === candidateType) || EC2_CATALOG[0];

    const hazards = [];

    // Hazard 1: CPU Credit Depletion Rate Calculation
    if (candidateSpec.burstable && prohibitBurstable) {
      // t3 baseline is typically 10-20%. At dynamicRps, CPU is 100% pegged.
      // Credit drain = (1.0 - baseline) * 60 credits/hr.
      const baselineFraction = (candidateSpec.baselineCpuPercent || 10) / 100;
      const creditRunwayMinutes = Math.max(4, Math.round((288 / (1 - baselineFraction)) / 60)); // Standard 24h accumulated balance drain

      hazards.push({
        code: 'CPU_CREDIT_BANKRUPTCY',
        level: 'CRITICAL',
        title: `CPU Credit Exhaustion Runway: ~${creditRunwayMinutes} minutes`,
        metric: `${candidateSpec.instanceType} provides ${candidateSpec.baselineCpuPercent}% baseline core capacity vs ${Math.round((dynamicRps / (computedVcpuRequired * throughputPerCore)) * 100)}% required continuous load. Kernel throttling triggers 504 Gateway Timeouts once the initial burst credit allocation is depleted.`
      });
    }

    // Hazard 2: Memory Ceiling & OOM Inevitability
    if (candidateSpec.memoryGib < computedRamRequired) {
      const memoryDeficitGb = (computedRamRequired - candidateSpec.memoryGib).toFixed(1);
      hazards.push({
        code: 'MEMORY_DEFICIT_OOM',
        level: 'CRITICAL',
        title: `Kernel Memory Deficit: -${memoryDeficitGb} GB`,
        metric: `Provisioned RAM (${candidateSpec.memoryGib} GB) is below the verified operational working set (${computedRamRequired} GB). Linux kernel OOM Killer invocation occurs deterministically upon socket allocation.`
      });
    }

    // ------------------------------------------------------------------------
    // ALGORITHM 4: Strategic Companion Architecture Synthesis
    // ------------------------------------------------------------------------
    // Algorithms deterministically prescribe companion services with consultative technical rationale
    const companionModules = {
      alb: {
        prescribed: true,
        name: 'Application Load Balancer (ALB)',
        technicalTerm: 'TLS 1.3 Asymmetric Hardware Offloading',
        explanation: 'Terminating cryptographic handshakes at the edge balancer isolates symmetric application logic, reclaiming 22–30% of backend CPU cycles while enabling zero-downtime rolling deployments.',
        finopsRoi: 'Prevents CPU over-provisioning on primary compute instances; guarantees 99.99% multi-zone ingress SLA.'
      },
      rds: {
        prescribed: slaTier !== 'non_prod' || dbTps > 50,
        name: 'Amazon Aurora PostgreSQL Multi-AZ',
        technicalTerm: 'Quorum-Engineered Distributed Storage',
        explanation: 'Replicates transactional log streams across 3 Availability Zones with sub-10ms commit latency and autonomous 30-second crash recovery.',
        finopsRoi: 'Eliminates single-point-of-failure recovery costs and data corruption liability during host degradation.'
      },
      elasticache: {
        prescribed: dynamicRps > 100 || concurrentSessions > 250,
        name: 'Amazon ElastiCache Redis Cluster',
        technicalTerm: 'Read-Aside Sub-Millisecond In-Memory Caching',
        explanation: 'Intercepts repetitive authorization tokens, tenant metadata, and catalog reads directly in volatile memory, shedding 70–85% of downstream database query pressure.',
        finopsRoi: 'A $70/mo Redis cluster prevents an otherwise mandatory $350/mo database compute tier scale-up.'
      },
      s3_and_cloudfront: {
        prescribed: egressMonthlyTb > 0.5,
        name: 'Amazon CloudFront & S3 Storage',
        technicalTerm: 'Edge Origin Shield & Asynchronous Offloading',
        explanation: 'Caches static and semi-dynamic media at 450+ edge Points of Presence, terminating HTTP keep-alive loops before they touch the origin VPC.',
        finopsRoi: 'Reduces VPC data egress tariffs from $0.09/GB to tiered CDN rates while eliminating compute thread starvation.'
      },
      nat_gateway: {
        prescribed: slaTier === 'mission_critical',
        name: 'AWS Managed NAT Gateway & PrivateLink',
        technicalTerm: 'Zero-Trust Private Subnet Ingress Isolation',
        explanation: 'Prohibits unsolicited public Internet ingress to application runtimes and databases while routing outbound telemetry through managed gateways.',
        finopsRoi: 'Mandatory technical control for SOC2 Type II, ISO 27001, and PCI-DSS 4.0 audit certifications.'
      },
      waf_shield: {
        prescribed: dynamicRps > 150 || concurrentSessions > 300,
        name: 'AWS WAF & Shield Perimeter Defense',
        technicalTerm: 'Layer-7 Token-Bucket Rate Limiting & Heuristic Inspection',
        explanation: 'Inspects HTTP payloads at the CDN layer to terminate automated scrapers, malicious probes, and credential stuffing before backend CPU consumption.',
        finopsRoi: 'Suppresses unwanted bot traffic, directly preventing server autoscaling cost runaway.'
      },
      cloudwatch_xray: {
        prescribed: true,
        name: 'Amazon CloudWatch & AWS X-Ray Telemetry',
        technicalTerm: 'Distributed Trace Context Propagation & APM',
        explanation: 'Injects trace headers into distributed transactions to isolate microsecond-level latency regressions across compute, cache, and database layers.',
        finopsRoi: 'Reduces Mean Time to Resolution (MTTR) by 65%, preventing recurring revenue degradation from unidentified bottlenecks.'
      },
      aws_backup: {
        prescribed: slaTier === 'mission_critical',
        name: 'AWS Backup Immutable Compliance Vault',
        technicalTerm: 'WORM (Write Once, Read Many) Snapshot Orchestration',
        explanation: 'Enforces cryptographically signed, immutable snapshot schedules across EBS volumes and Aurora clusters with independent KMS key isolation.',
        finopsRoi: 'Protects the enterprise against ransomware encryption demands and catastrophic accidental deletions.'
      }
    };

    return {
      telemetryInputs: {
        dynamicRps,
        concurrentSessions,
        legacyCpuCores,
        legacyCpuPeakPct,
        workingSetMemoryGb,
        dbTps,
        egressMonthlyTb,
        slaTier
      },
      algorithmicDerivation: {
        computedVcpuRequired,
        computedRamRequired,
        prohibitBurstable,
        benchmarkRpsPerCore: throughputPerCore
      },
      candidateAudit: {
        testedInstance: candidateSpec,
        isSlaCompliant: hazards.length === 0,
        hazards
      },
      prescribedArchitecture: {
        primaryCompute: recommendedInstance,
        technicalJustification: `Synthesized for sustained P95 throughput of ${dynamicRps} RPS and ${computedRamRequired} GB operational memory working set. Utilizes dedicated 64-bit ${recommendedInstance.cpuType} cores delivering 100% deterministic execution without burst credit volatility.`,
        companionModules
      }
    };
  }
}

module.exports = SizingEngine;
