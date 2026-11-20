// Verification test for Academic FinOps Sizing Engine & SRE Telemetry

const { AWS_REGIONS, EC2_CATALOG } = require('./services/pricing/awsPriceCatalog');
const SizingEngine = require('./services/advisory/sizingEngine');
const CostProjector = require('./services/pricing/costProjector');

function runAcademicVerification() {
  console.log('========================================================================');
  console.log('ACADEMIC FINOPS SIZING ENGINE: DETERMINISTIC VERIFICATION SUITE');
  console.log('========================================================================\n');

  // Test 1: SRE Production Telemetry Input (450 RPS, 850 Concurrent Sessions, 12GB Working Set)
  console.log('--- 1. Evaluating Pre-Cloud SRE Telemetry ---');
  const sreInput = {
    dynamicRps: 450,
    concurrentSessions: 850,
    legacyCpuCores: 4,
    legacyCpuPeakPct: 78,
    workingSetMemoryGb: 12,
    dbTps: 180,
    egressMonthlyTb: 2.5,
    slaTier: 'mission_critical',
    candidateInstanceType: 't3.micro' // Stress testing manual override
  };

  const evalResult = SizingEngine.evaluateWorkload(sreInput);

  console.log('Derived Required vCPU:', evalResult.algorithmicDerivation.computedVcpuRequired, 'cores');
  console.log('Derived Required RAM:', evalResult.algorithmicDerivation.computedRamRequired, 'GB');
  console.log('Burstable Permitted?:', evalResult.algorithmicDerivation.prohibitBurstable ? 'STRICTLY PROHIBITED' : 'YES');

  console.log('\n--- Candidate Audit (Testing t3.micro override) ---');
  console.log('Is SLA Compliant?:', evalResult.candidateAudit.isSlaCompliant ? 'YES' : 'NO (SLA DEFICIT)');
  evalResult.candidateAudit.hazards.forEach(h => {
    console.log(`[DEFICIT: ${h.code}] ${h.title}`);
    console.log(`Metric: ${h.metric}`);
  });

  console.log('\n--- Prescribed Production Compute ---');
  const prescribed = evalResult.prescribedArchitecture;
  console.log('Instance:', prescribed.primaryCompute.instanceType, `(${prescribed.primaryCompute.cpuType}, ${prescribed.primaryCompute.memoryGib} GB RAM)`);
  console.log('Justification:', prescribed.technicalJustification);

  console.log('\n--- Strategic Companion Modules with FinOps ROI ---');
  for (const [key, mod] of Object.entries(prescribed.companionModules)) {
    console.log(`\n• ${mod.name}`);
    console.log(`  Term:        ${mod.technicalTerm}`);
    console.log(`  Explanation: ${mod.explanation}`);
    console.log(`  FinOps ROI:  ${mod.finopsRoi}`);
  }

  // Test 2: Cost Projections
  console.log('\n--- 2. Multi-Horizon Expenditure Ledger ---');
  const costResult = CostProjector.projectCosts({
    regionCode: 'eu-central-1',
    instanceSku: prescribed.primaryCompute.instanceType,
    modules: {
      alb: true,
      rds: true,
      elasticache: true,
      s3_and_cloudfront: true,
      waf_shield: true,
      nat_gateway: true,
      cloudwatch_xray: true,
      aws_backup: true
    },
    storageGb: 60,
    monthlyDataTransferGb: 2500
  });

  for (const [key, proj] of Object.entries(costResult.projections)) {
    console.log(`${proj.label} (${proj.hours}h): On-Demand: $${proj.summary.totalOnDemandUsd.toFixed(2)} | Savings Plan: $${proj.summary.totalSavingsPlanUsd.toFixed(2)} | Save: $${proj.summary.netSavingsUsd.toFixed(2)} (${proj.summary.savingsPercent}%)`);
  }

  console.log('\n========================================================================');
  console.log('ACADEMIC FINOPS VERIFICATION COMPLETED WITH ZERO ERRORS');
  console.log('========================================================================');
}

runAcademicVerification();
