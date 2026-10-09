# ADR-027: International Adapter Architecture — US Healthcare

**Status:** Accepted  
**Date:** 2026-10-09  
**Supersedes:** None  
**Related:** ADR-004 (Bounded State), ADR-015 (Finance), ADR-018 (AI Coder)

## Context

Deer's Rock currently targets Indonesian public hospitals (RSUD Type C) with:
- BPJS Kesehatan as dominant payer (80%+)
- INA-CBG tariff system (Permenkes 28/2020)
- Indonesian patient identity (NIK, RT/RW addresses)
- Puskesmas referral chain
- E-Catalogue formulary (205 drugs)

An international client requires a **US hospital simulation** with fundamentally different:
- Insurance landscape (Medicare, Medicaid, Private, TRICARE, VA)
- Billing codes (CPT for procedures, HCPCS for supplies)
- Payment model (MS-DRG instead of fixed tariffs)
- Patient responsibility (deductible + copay + coinsurance)
- Claims process (clearinghouse, EOB, prior authorization)

The question is **how to structure adapters** to support multiple countries without duplicating core logic.

## Decision

### Package Structure: Separate npm Packages (Monorepo)

```
Deers-Rock/
├── packages/
│   ├── core/                  # @deers-rock/core — shared engine
│   │   └── src/
│   │       ├── engine/        # world, markov, clock, event-queue
│   │       ├── patient/       # schema, generator
│   │       ├── agent/         # system, types
│   │       ├── referral/      # base referral logic
│   │       └── ...
│   ├── adapter-indonesia/     # @deers-rock/adapter-indonesia
│   │   └── src/
│   │       ├── payer/         # BPJS, JR, private
│   │       ├── tariff/        # INA-CBG
│   │       ├── formulary/     # E-Catalogue
│   │       └── identity/      # NIK generator
│   ├── adapter-us/            # @deers-rock/adapter-us
│   │   └── src/
│   │       ├── payer/         # Medicare, Medicaid, Private
│   │       ├── tariff/        # MS-DRG
│   │       ├── formulary/     # FDA-approved drugs
│   │       └── identity/      # MRN generator
│   └── app/                   # @deers-rock/app — web server
├── kaggle/
└── docs/
```

### Interface Contracts (Core Abstractions)

```typescript
// packages/core/src/adapters/payer-system.ts
export interface IPayerSystem {
  assignPayer(patient: Patient, rng: () => number): PayerAssignment;
  submitClaim(encounter: Encounter, tariff: TariffEntry): Claim;
  adjudicate(claim: Claim): AdjudicationResult;
  getCoverageRatio(payer: string): number;
}

// packages/core/src/adapters/tariff-system.ts
export interface ITariffSystem {
  lookupTariff(icd10: string, cpt?: string, severity?: SeverityLevel): TariffEntry;
  inferSeverity(diagnoses: Diagnosis[]): SeverityLevel;
  calculatePatientResponsibility(total: number, tariff: TariffEntry, payer: PayerAssignment): FinancialBreakdown;
}

// packages/core/src/adapters/formulary.ts
export interface IFormulary {
  getDrug(code: string): DrugRecord;
  getDrugPrice(code: string, payer: string): number;
  getEssentialDrugs(): string[];
}

// packages/core/src/adapters/identity.ts
export interface IIdentityGenerator {
  generatePatientId(): string;
  generateEncounterId(): string;
  generateBedId(): string;
  generateAgentId(): string;
  formatNationalId(patient: Patient): string;  // NIK for ID, MRN for US
}
```

### Migration Strategy

1. **Phase 1** (this sprint): Define interfaces, extract Indonesia to adapter package
2. **Phase 2** (next sprint): Build US adapter (Medicare/MS-DRG)
3. **Phase 3**: Migrate core engine to use interfaces
4. **Phase 4**: Publish to npm as separate packages

## US-Specific Requirements

### Payer Mix (US Hospital, 2024 benchmarks)
| Payer | Share | Notes |
|-------|-------|-------|
| **Private Insurance** | 40-50% | Employer-sponsored, negotiated rates |
| **Medicare** | 20-25% | Age 65+, disability, ESRD |
| **Medicaid** | 15-20% | Low-income, state-administered |
| **Self-pay** | 5-10% | Uninsured, out-of-network |
| **TRICARE/VA** | 2-5% | Military, veterans |

### Billing Differences vs Indonesia

| Aspect | Indonesia | United States |
|--------|-----------|---------------|
| **Diagnosis codes** | ICD-10-WM | ICD-10-CM |
| **Procedure codes** | CBG group | CPT-4 + HCPCS Level II |
| **Payment model** | Fixed tariff per CBG | MS-DRG (severity-adjusted) |
| **Patient responsibility** | Co-pay (10-20%) | Deductible + Copay + Coinsurance |
| **Claims submission** | Direct to BPJS | Clearinghouse → Payer |
| **Prior authorization** | Rare | Common for procedures |
| **Charge master** | Standardized | Hospital-specific pricing |
| **EOB** | Simple statement | Complex Explanation of Benefits |

### MS-DRG vs INA-CBG

| Feature | INA-CBG (ID) | MS-DRG (US) |
|---------|--------------|-------------|
| **Groups** | ~1,500 | ~750 |
| **Severity** | SEP 0-4 (15 points) | MCC/CC adjustment |
| **Weight** | Fixed tariff (IDR) | Relative weight × base rate |
| **Calculation** | ICD-10 → CBG group | ICD-10-CM + CPT → DRG |
| **Payment** | Single rate per admission | Rate × DRG weight × adjustment |

### Key US Logic Changes

1. **Payer assignment**: Age-based (Medicare 65+, Medicaid by income, Private by employment)
2. **Tariff lookup**: MS-DRG table with relative weights
3. **Claim adjudication**: Deductible first, then copay/coinsurance
4. **Denial reasons**: Prior auth missing, medical necessity, out-of-network
5. **Revenue cycle**: Charge → Claim → Adjudication → Payment → EOB

## Consequences

### Positive
- Core engine stays clean and country-agnostic
- Each country adapter is independently testable
- New countries can be added without touching core
- Bundle size: users only install their country adapter

### Negative
- Initial migration effort: extract Indonesia to adapter
- Monorepo adds build complexity (workspace config)
- Cross-package testing needed
- Version coupling: core changes require adapter updates

### Trade-offs
- **For separate packages**: Isolation, independent releases, smaller bundles
- **Against separate packages**: More maintenance, version sync complexity
- **Mitigation**: Use npm workspaces for dev; version core as peerDep

## Implementation Plan

| Phase | Work | Effort |
|-------|------|--------|
| **1** | Define interface contracts in `packages/core/src/adapters/` | 1 day |
| **2** | Extract Indonesia payer/tariff/formulary to `adapter-indonesia` | 2 days |
| **3** | Build US payer (Medicare/Medicaid/Private) | 2 days |
| **4** | Build US tariff (MS-DRG lookup) | 2 days |
| **5** | Build US identity (MRN generator) | 0.5 day |
| **6** | Wire core to use adapters via dependency injection | 1 day |
| **7** | Add US integration tests | 1 day |
| **8** | Monorepo setup (npm workspaces) | 0.5 day |
| **Total** | | **~10 days** |

## References
- CMS MS-DRG Glossary: https://www.cms.gov/Medicare/Medicare-Fee-for-Service-Payment/AcuteInpatientPPS/MS-DRG-Classifications-and Software.html
- ICD-10-CM: https://www.cdc.gov/nchs/icd/icd10cm.htm
- CPT Codes: https://www.ama-assn.org/practice-management/cpt
- Medicare Payment Advisory Commission (MedPAC) reports
