# FRACTAL Engine (AWS Cloud Migration Telemetry & Sizing)

> Empirical capacity planning and deterministic cloud migration architecture. Replaces speculative sizing with mathematical SRE formulas (P95 dynamic throughput, working set memory, database TPS, and SLA tiers) to prescribe resilient AWS compute topology, eliminate burstable CPU failure liabilities, and forecast multi-horizon expenditure.

[![Framework: FinOps](https://img.shields.io/badge/Framework-Academic%20FinOps-black.svg)](#)
[![Design: Swiss Monochrome](https://img.shields.io/badge/Design-Strict%20Monochrome-black.svg)](#)
[![Architecture: AWS Enterprise](https://img.shields.io/badge/Architecture-Deterministic%20SRE-black.svg)](#)

---

## Theoretical Framework: Algorithms > User Selection

In conventional cloud calculators, users arbitrarily select virtual machine SKUs based on immediate hourly cost, inadvertently introducing systemic operational risk (e.g., allocating a burstable `t3.micro` for a high-traffic production application). 

This platform operates as an **algorithmic decision engine** where empirical systems telemetry dictates the prescribed infrastructure:

$$\text{vCPU}_{\text{required}} = \left\lceil \frac{\text{RPS}_{\text{P95}}}{\text{Throughput}_{\text{core}}} \right\rceil$$

$$\text{RAM}_{\text{required}} = \left\lceil (\text{WorkingSet}_{\text{RAM}} \times 1.25) + (\text{Concurrency} \times 0.004) \right\rceil$$

### Mathematical Deficit Detection
When under-provisioned allocations are audited, the engine calculates deterministic failure boundaries:
1. **CPU Credit Depletion Runway**: Computes the exact minutes until kernel throttling occurs under sustained P95 demand.
2. **Kernel Memory Deficit**: Calculates the exact RAM shortfall triggering the Linux kernel Out-Of-Memory (OOM) killer.

---

## Architectural Taxonomy & Educational Terminology

| Component | Technical Mechanism | Engineering Justification | FinOps ROI & SLA Impact |
| :--- | :--- | :--- | :--- |
| **Application Load Balancer (ALB)** | *TLS 1.3 Asymmetric Hardware Offloading* | Decouples cryptographic handshake CPU consumption (22–30% overhead) from application runtime workers. | Eliminates compute over-provisioning; enforces 99.99% ingress SLA. |
| **Amazon Aurora Multi-AZ** | *Quorum-Engineered Distributed Storage* | Replicates database log streams 6 ways across 3 AZs with sub-10ms commit latency and autonomous 30s crash failover. | Mitigates data corruption liability and downtime costs ($5,600/min). |
| **Amazon ElastiCache Redis** | *Read-Aside Sub-Millisecond In-Memory Caching* | Intercepts repetitive auth tokens, sessions, and catalog reads directly in volatile memory. | A $70/mo Redis cluster prevents a $350/mo database compute scale-up. |
| **Amazon CloudFront & S3** | *Edge Origin Shield & Asynchronous Offload* | Caches static payloads across 450+ Points of Presence, terminating HTTP keep-alive loops before origin VPC ingress. | Replaces high VPC egress tariffs ($0.09/GB) with tiered CDN bandwidth. |
| **AWS Managed NAT Gateway** | *Zero-Trust Private Subnet Ingress Isolation* | Prohibits unsolicited inbound traffic from public networks to application nodes and databases. | Mandatory technical control for SOC2 Type II, ISO 27001, and PCI-DSS 4.0. |
| **AWS WAF & Shield** | *Layer-7 Token-Bucket Rate Limiting* | Inspects HTTP headers and payloads at edge to terminate scrapers and Layer 7 DDoS before backend CPU execution. | Suppresses bot traffic, directly preventing server autoscaling runaway. |
| **CloudWatch & AWS X-Ray** | *Distributed Trace Context Propagation & APM* | Injects W3C trace headers to isolate microsecond-level latency bottlenecks across microservices. | Reduces Mean Time to Resolution (MTTR) by 65%. |
| **AWS Backup Vault** | *WORM (Write Once, Read Many) Snapshot Vault* | Enforces cryptographically immutable snapshot schedules with independent KMS key isolation. | Assures RPO < 1h and RTO < 15m; neutralizes ransomware threats. |

---

## Multi-Horizon Financial Ledger (Example: 450 P95 RPS / 850 Concurrent Sessions)

*Synthesized for Frankfurt (`eu-central-1`) with full deterministic architectural resilience:*

```
Horizon: 1 Week (168h)   On-Demand: $275.02  | 1-Yr Savings Plan: $252.09  | Net Savings: $22.93 (8%)
Horizon: 2 Weeks (336h)  On-Demand: $558.57  | 1-Yr Savings Plan: $512.71  | Net Savings: $45.86 (8%)
Horizon: 1 Month (730h)  On-Demand: $1,250.64| 1-Yr Savings Plan: $1,151.00| Net Savings: $99.64 (8%)
Horizon: 3 Months (2190h) On-Demand: $4,093.19| 1-Yr Savings Plan: $3,794.26| Net Savings: $298.93 (7%)
```

---

## Repository Structure

```
.
├── server.js                          # Native HTTP Server, API Gateway & Edge routing
├── services/
│   ├── advisory/
│   │   └── sizingEngine.js            # Empirical capacity formulas, deficit audits & upsell rules
│   ├── pricing/
│   │   ├── awsPriceCatalog.js         # Enterprise AWS catalog with synchronized pricing
│   │   └── costProjector.js           # Multi-horizon dynamic TCO forecasting engine
│   └── export/
│       └── terraformGenerator.js      # Production HCL generator (VPC, WAF, Aurora, Redis, ALB)
├── public/
│   ├── index.html                     # Academic Swiss-monochrome interface (Pure typography)
│   ├── styles.css                     # Strict black & white design system (zero color/trackers)
│   └── app.js                         # Reactive controller, SRE telemetry intake & FinOps ledger
└── test_direct.js                     # Mathematical verification suite
```

---

## Execution

```bash
node server.js
```

Dashboard is accessible at `http://localhost:3000`.
