// FRACTAL Engine & Deterministic Controller
// Interactive B2B SRE Experience | Strict Monochrome & Grayscale

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    regionCode: 'eu-central-1',
    dynamicRps: 450,
    concurrentSessions: 850,
    workingSetMemoryGb: 12,
    dbTps: 180,
    legacyCpuCores: 4,
    egressMonthlyTb: 2.5,
    slaTier: 'mission_critical',
    selectedInstanceType: null, // Will default to prescribed by algorithm
    activeHorizon: '1_month',
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
    catalog: [],
    advisoryData: null,
    costData: null
  };

  // DOM Elements
  const regionSelect = document.getElementById('regionSelect');
  const latencyBadge = document.getElementById('latencyBadge');
  const rpsSlider = document.getElementById('rpsSlider');
  const rpsDisplay = document.getElementById('rpsDisplay');
  const sessionsSlider = document.getElementById('sessionsSlider');
  const sessionsDisplay = document.getElementById('sessionsDisplay');
  const inputMem = document.getElementById('inputMem');
  const inputDbTps = document.getElementById('inputDbTps');
  const inputLegacyCores = document.getElementById('inputLegacyCores');
  const inputEgressTb = document.getElementById('inputEgressTb');

  const valComputedVcpu = document.getElementById('valComputedVcpu');
  const valComputedRam = document.getElementById('valComputedRam');
  const valBurstableStatus = document.getElementById('valBurstableStatus');
  const synthesisExplanation = document.getElementById('synthesisExplanation');

  const instanceSelect = document.getElementById('instanceSelect');
  const instanceSpecsBar = document.getElementById('instanceSpecsBar');
  const btnSimulateT3 = document.getElementById('btnSimulateT3');
  const btnEnforcePrescribed = document.getElementById('btnEnforcePrescribed');

  const hazardAuditBox = document.getElementById('hazardAuditBox');
  const auditFlag = document.getElementById('auditFlag');
  const auditCode = document.getElementById('auditCode');
  const auditTitle = document.getElementById('auditTitle');
  const auditMetricDesc = document.getElementById('auditMetricDesc');
  const btnEnforceSafe = document.getElementById('btnEnforceSafe');

  const priceValue = document.getElementById('priceValue');
  const horizonLabel = document.getElementById('horizonLabel');
  const savingsPlanPrice = document.getElementById('savingsPlanPrice');
  const savingsDeltaPrice = document.getElementById('savingsDeltaPrice');
  const savingsPercent = document.getElementById('savingsPercent');

  const costCompute = document.getElementById('costCompute');
  const costStorage = document.getElementById('costStorage');
  const costNetwork = document.getElementById('costNetwork');
  const costManaged = document.getElementById('costManaged');
  const barCompute = document.getElementById('barCompute');
  const barStorage = document.getElementById('barStorage');
  const barNetwork = document.getElementById('barNetwork');
  const barServices = document.getElementById('barServices');
  const itemizedList = document.getElementById('itemizedList');

  const btnExportTf = document.getElementById('btnExportTf');
  const tfModal = document.getElementById('tfModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const tfCodeBlock = document.getElementById('tfCodeBlock');
  const btnCopyTf = document.getElementById('btnCopyTf');

  // Service switches mapping
  const serviceSwitches = {
    alb: { el: document.getElementById('modAlb'), card: document.getElementById('cardAlb') },
    rds: { el: document.getElementById('modRds'), card: document.getElementById('cardRds') },
    elasticache: { el: document.getElementById('modRedis'), card: document.getElementById('cardRedis') },
    s3_and_cloudfront: { el: document.getElementById('modCdn'), card: document.getElementById('cardCdn') },
    waf_shield: { el: document.getElementById('modWaf'), card: document.getElementById('cardWaf') },
    nat_gateway: { el: document.getElementById('modNat'), card: document.getElementById('cardNat') },
    cloudwatch_xray: { el: document.getElementById('modCw'), card: document.getElementById('cardCw') },
    aws_backup: { el: document.getElementById('modBackup'), card: document.getElementById('cardBackup') }
  };

  // Initialize
  async function init() {
    await loadCatalog();
    setupEventListeners();
    setupAccordions();
    measureLatency();
    triggerEvaluation();
  }

  // Load Catalog
  async function loadCatalog() {
    try {
      const res = await fetch('/api/v1/catalog');
      const data = await res.json();
      state.catalog = data.instances;
      populateInstanceSelect();
    } catch (err) {
      console.error('Failed to load catalog:', err);
    }
  }

  function populateInstanceSelect() {
    instanceSelect.innerHTML = state.catalog.map(item => `
      <option value="${item.instanceType}" ${item.instanceType === state.selectedInstanceType ? 'selected' : ''}>
        ${item.instanceType} [${item.vcpu} vCPU, ${item.memoryGib} GB RAM, ${item.cpuType}] - $${item.hourlyUsd}/hr
      </option>
    `).join('');

    updateSpecsBar();
  }

  function updateSpecsBar() {
    const inst = state.catalog.find(i => i.instanceType === state.selectedInstanceType);
    if (!inst) return;

    instanceSpecsBar.innerHTML = `
      <span class="spec-pill">Arch: ${inst.arch}</span>
      <span class="spec-pill">Processor: ${inst.cpuType}</span>
      <span class="spec-pill">${inst.burstable ? 'Burstable (' + inst.baselineCpuPercent + '% Baseline)' : '100% Dedicated Core Baseline'}</span>
      <span class="spec-pill">Network: ${inst.networkPerf}</span>
    `;
  }

  async function measureLatency() {
    const start = performance.now();
    try {
      await fetch('/api/v1/regions', { method: 'GET', cache: 'no-store' });
      const rtt = Math.round(performance.now() - start);
      latencyBadge.textContent = `RTT ${Math.max(12, rtt)} ms`;
    } catch (e) {
      latencyBadge.textContent = 'RTT 18 ms';
    }
  }

  // Sizing Evaluation & Projection
  async function triggerEvaluation() {
    try {
      // 1. Post to Sizing Engine
      const advisoryRes = await fetch('/api/v1/advisory/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dynamicRps: state.dynamicRps,
          concurrentSessions: state.concurrentSessions,
          workingSetMemoryGb: state.workingSetMemoryGb,
          dbTps: state.dbTps,
          legacyCpuCores: state.legacyCpuCores,
          egressMonthlyTb: state.egressMonthlyTb,
          slaTier: state.slaTier,
          candidateInstanceType: state.selectedInstanceType
        })
      });
      state.advisoryData = await advisoryRes.json();

      // Derivations
      const deriv = state.advisoryData.algorithmicDerivation;
      valComputedVcpu.textContent = `${deriv.computedVcpuRequired} Cores`;
      valComputedRam.textContent = `${deriv.computedRamRequired} GB`;
      valBurstableStatus.textContent = deriv.prohibitBurstable ? 'Prohibited' : 'Permitted';

      const prescribed = state.advisoryData.prescribedArchitecture;
      if (!state.selectedInstanceType) {
        state.selectedInstanceType = prescribed.primaryCompute.instanceType;
        populateInstanceSelect();
      }

      synthesisExplanation.textContent = prescribed.technicalJustification;

      // Update Audit Hazard Card
      const audit = state.advisoryData.candidateAudit;
      if (!audit.isSlaCompliant && audit.hazards.length > 0) {
        const topHazard = audit.hazards[0];
        hazardAuditBox.className = 'audit-alert-panel has-deficit';
        auditFlag.textContent = `CRITICAL DEFICIT: ${topHazard.code}`;
        auditCode.textContent = 'NON_COMPLIANT';
        auditTitle.textContent = topHazard.title;
        auditMetricDesc.textContent = topHazard.metric;
        btnEnforceSafe.textContent = `Enforce Prescribed Allocation (${prescribed.primaryCompute.instanceType})`;
        btnEnforceSafe.style.display = 'block';
      } else {
        hazardAuditBox.className = 'audit-alert-panel';
        auditFlag.textContent = 'Mathematical Sizing Audit';
        auditCode.textContent = 'VERIFIED_RESILIENT';
        auditTitle.textContent = `Deterministic Capacity Sizing Verified`;
        auditMetricDesc.textContent = `Allocated compute (${state.selectedInstanceType}) satisfies P95 load requirements with zero CPU credit volatility.`;
        btnEnforceSafe.style.display = 'none';
      }

      // 2. Post to Cost Projector
      const costRes = await fetch('/api/v1/calculator/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regionCode: state.regionCode,
          instanceSku: state.selectedInstanceType,
          modules: state.modules,
          storageGb: Math.max(60, state.workingSetMemoryGb * 4),
          monthlyDataTransferGb: Math.round(state.egressMonthlyTb * 1024)
        })
      });
      state.costData = await costRes.json();
      renderLedger();

    } catch (err) {
      console.error('Sizing evaluation failed:', err);
    }
  }

  // Render Financial Ledger
  function renderLedger() {
    if (!state.costData || !state.costData.projections) return;

    const proj = state.costData.projections[state.activeHorizon];
    if (!proj) return;

    // Price
    priceValue.textContent = proj.summary.totalOnDemandUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    horizonLabel.textContent = `per ${proj.label} (On-Demand)`;

    // Savings Plan
    savingsPlanPrice.textContent = proj.summary.totalSavingsPlanUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    savingsDeltaPrice.textContent = proj.summary.netSavingsUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    savingsPercent.textContent = `${proj.summary.savingsPercent}%`;

    // Breakdown
    costCompute.textContent = `$${proj.breakdown.compute.toFixed(2)}`;
    costStorage.textContent = `$${proj.breakdown.storage.toFixed(2)}`;
    costNetwork.textContent = `$${proj.breakdown.network.toFixed(2)}`;
    costManaged.textContent = `$${proj.breakdown.managedServices.toFixed(2)}`;

    // Allocation bar
    const total = proj.summary.totalOnDemandUsd;
    if (total > 0) {
      barCompute.style.width = `${(proj.breakdown.compute / total) * 100}%`;
      barStorage.style.width = `${(proj.breakdown.storage / total) * 100}%`;
      barNetwork.style.width = `${(proj.breakdown.network / total) * 100}%`;
      barServices.style.width = `${(proj.breakdown.managedServices / total) * 100}%`;
    }

    // Itemized Ledger
    itemizedList.innerHTML = proj.itemizedServices.length > 0
      ? proj.itemizedServices.map(s => `<li><span>${s.name}</span><strong>$${s.cost.toFixed(2)}</strong></li>`).join('')
      : '<li style="color: var(--text-muted);">Zero companion architectural modules active</li>';
  }

  // Accordion Toggle Handlers
  function setupAccordions() {
    document.querySelectorAll('.accordion-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const card = btn.closest('.service-card-item');
        if (card) {
          card.classList.toggle('expanded');
        }
      });
    });
  }

  // Setup Event Listeners
  function setupEventListeners() {
    regionSelect.addEventListener('change', (e) => {
      state.regionCode = e.target.value;
      measureLatency();
      triggerEvaluation();
    });

    // P95 RPS Slider
    rpsSlider.addEventListener('input', (e) => {
      state.dynamicRps = parseInt(e.target.value, 10);
      rpsDisplay.textContent = `${state.dynamicRps.toLocaleString()} req/s`;
      triggerEvaluation();
    });

    // Sessions Slider
    sessionsSlider.addEventListener('input', (e) => {
      state.concurrentSessions = parseInt(e.target.value, 10);
      sessionsDisplay.textContent = `${state.concurrentSessions.toLocaleString()} active`;
      triggerEvaluation();
    });

    // Hardware Telemetry Inputs
    inputMem.addEventListener('input', (e) => {
      state.workingSetMemoryGb = parseFloat(e.target.value) || 12;
      triggerEvaluation();
    });
    inputDbTps.addEventListener('input', (e) => {
      state.dbTps = parseInt(e.target.value, 10) || 180;
      triggerEvaluation();
    });
    inputLegacyCores.addEventListener('input', (e) => {
      state.legacyCpuCores = parseInt(e.target.value, 10) || 4;
      triggerEvaluation();
    });
    inputEgressTb.addEventListener('input', (e) => {
      state.egressMonthlyTb = parseFloat(e.target.value) || 2.5;
      triggerEvaluation();
    });

    // SLA Segmented Control
    document.querySelectorAll('#slaTierGroup .sla-segment').forEach(seg => {
      seg.addEventListener('click', () => {
        document.querySelectorAll('#slaTierGroup .sla-segment').forEach(s => s.classList.remove('selected'));
        seg.classList.add('selected');
        state.slaTier = seg.dataset.tier;
        triggerEvaluation();
      });
    });

    // Instance Select
    instanceSelect.addEventListener('change', (e) => {
      state.selectedInstanceType = e.target.value;
      updateSpecsBar();
      triggerEvaluation();
    });

    // Simulate t3.micro
    btnSimulateT3.addEventListener('click', () => {
      state.selectedInstanceType = 't3.micro';
      populateInstanceSelect();
      triggerEvaluation();
    });

    // Enforce Prescribed Optimal Instance
    btnEnforcePrescribed.addEventListener('click', enforcePrescription);
    btnEnforceSafe.addEventListener('click', enforcePrescription);

    function enforcePrescription() {
      if (state.advisoryData && state.advisoryData.prescribedArchitecture) {
        state.selectedInstanceType = state.advisoryData.prescribedArchitecture.primaryCompute.instanceType;
        populateInstanceSelect();
        triggerEvaluation();
      }
    }

    // Companion Services Switches
    Object.keys(serviceSwitches).forEach(key => {
      const { el, card } = serviceSwitches[key];
      if (el) {
        el.addEventListener('change', (e) => {
          state.modules[key] = e.target.checked;
          if (card) {
            if (e.target.checked) card.classList.add('active');
            else card.classList.remove('active');
          }
          triggerEvaluation();
        });
      }
    });

    // Horizon Tabs
    document.querySelectorAll('#horizonTabs .time-segment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#horizonTabs .time-segment-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeHorizon = btn.dataset.horizon;
        renderLedger();
      });
    });

    // Terraform Export Modal
    btnExportTf.addEventListener('click', async () => {
      try {
        const inst = state.catalog.find(i => i.instanceType === state.selectedInstanceType) || { instanceType: state.selectedInstanceType, arch: 'arm64' };
        const res = await fetch('/api/v1/export/terraform', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            regionCode: state.regionCode,
            instance: inst,
            modules: state.modules,
            storageGb: Math.max(60, state.workingSetMemoryGb * 4)
          })
        });
        const data = await res.json();
        tfCodeBlock.textContent = data.hcl;
        tfModal.classList.remove('hidden');
      } catch (err) {
        console.error('Terraform export failed:', err);
      }
    });

    btnCloseModal.addEventListener('click', () => {
      tfModal.classList.add('hidden');
    });

    tfModal.addEventListener('click', (e) => {
      if (e.target === tfModal) tfModal.classList.add('hidden');
    });

    btnCopyTf.addEventListener('click', () => {
      navigator.clipboard.writeText(tfCodeBlock.textContent);
      btnCopyTf.textContent = 'COPIED TO CLIPBOARD';
      setTimeout(() => {
        btnCopyTf.textContent = 'Copy HCL Manifest';
      }, 2000);
    });
  }

  init();
});
