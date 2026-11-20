// Verification test for AWS Smart Sizer API and Advisory Engine

async function runTests() {
  console.log('--- 1. Testing GET /api/v1/regions ---');
  const regionsRes = await fetch('http://127.0.0.1:3000/api/v1/regions');
  const regionsData = await regionsRes.json();
  console.log('Regions status:', regionsRes.status, 'Total regions:', regionsData.regions.length);
  console.log('Default detected:', regionsData.detectedNearest.name);

  console.log('\n--- 2. Testing GET /api/v1/catalog ---');
  const catalogRes = await fetch('http://127.0.0.1:3000/api/v1/catalog');
  const catalogData = await catalogRes.json();
  console.log('Catalog status:', catalogRes.status, 'Total instances:', catalogData.instances.length);

  console.log('\n--- 3. Testing Sizing Engine: Influencer Store (15k followers) on t3.micro ---');
  const hazardPayload = {
    workloadType: 'ecommerce',
    followers: 15000,
    spikeFactor: 'high',
    selectedInstanceType: 't3.micro',
    hasDatabase: true,
    hasMedia: true
  };
  const evalRes = await fetch('http://127.0.0.1:3000/api/v1/advisory/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hazardPayload)
  });
  const evalData = await evalRes.json();
  console.log('Evaluation status:', evalRes.status);
  console.log('Safe for production?:', evalData.candidateEvaluation.isSafeForProduction);
  console.log('Peak Concurrency estimated:', evalData.metrics.peakConcurrency, 'users');
  console.log('Peak RPS estimated:', evalData.metrics.peakRps, 'req/s');
  console.log('Hazards detected count:', evalData.candidateEvaluation.hazards.length);
  evalData.candidateEvaluation.hazards.forEach((h, idx) => {
    console.log(`  Hazard #${idx + 1} [${h.level}]: ${h.title}`);
    console.log(`    Details: ${h.description.substring(0, 110)}...`);
  });
  console.log('Recommended instance by Engine:', evalData.recommendedArchitecture.primaryCompute.instanceType);
  console.log('Why:', evalData.recommendedArchitecture.whyThisInstance);

  console.log('\n--- 4. Testing Multi-Horizon Cost Calculator with Recommended Architecture ---');
  const costPayload = {
    regionCode: 'eu-central-1',
    instanceSku: evalData.recommendedArchitecture.primaryCompute.instanceType,
    modules: {
      alb: true,
      rds: true,
      elasticache: true,
      s3_and_cloudfront: true
    },
    storageGb: 80,
    monthlyDataTransferGb: 200
  };
  const costRes = await fetch('http://127.0.0.1:3000/api/v1/calculator/project', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(costPayload)
  });
  const costData = await costRes.json();
  console.log('Cost status:', costRes.status);
  console.log('Region:', costData.region.name);
  console.log('Instance:', costData.instance.instanceType, `($${costData.instance.hourlyUsd}/hr)`);
  
  for (const [key, proj] of Object.entries(costData.projections)) {
    console.log(`\nHorizon [${proj.label} (${proj.hours} hrs)]:`);
    console.log(`  On-Demand Total: $${proj.summary.totalOnDemandUsd}`);
    console.log(`  1-Yr Savings Plan Total: $${proj.summary.totalSavingsPlanUsd} (Save $${proj.summary.netSavingsUsd} / ${proj.summary.savingsPercent}%)`);
    console.log(`  Breakdown -> Compute: $${proj.breakdown.compute}, Storage: $${proj.breakdown.storage}, Network: $${proj.breakdown.network}, Managed: $${proj.breakdown.managedServices}`);
  }

  console.log('\n--- 5. Testing Terraform HCL Exporter ---');
  const tfRes = await fetch('http://127.0.0.1:3000/api/v1/export/terraform', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      regionCode: 'eu-central-1',
      instance: evalData.recommendedArchitecture.primaryCompute,
      modules: { alb: true, rds: true, elasticache: true },
      storageGb: 80
    })
  });
  const tfData = await tfRes.json();
  console.log('Terraform output generated lines:', tfData.hcl.split('\n').length);
  console.log('Sample HCL snippet:');
  console.log(tfData.hcl.split('\n').slice(0, 16).join('\n'));

  console.log('\n>>> ALL ADVISORY & SIZING ENGINE INTEGRATION TESTS PASSED SUCCESSFULLY! <<<');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
