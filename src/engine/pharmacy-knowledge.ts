import type { Medication, Diagnosis } from "../patient/schema.js";

export const MED_ALLERGEN_MAP: Record<string, string[]> = {
  "ACE": ["ACE inhibitor"],
  "MET": [],
  "ATR": ["statin"],
  "OMP": [],
  "LVF": ["fluoroquinolone"],
  "PRC": ["paracetamol"],
  "HEP": ["heparin", "LMWH"],
  "SAL": [],
  "FUR": ["sulfonamide"],
  "DIA": ["benzodiazepine"],
  "AMX": ["penicillin", "amoxicillin"],
  "CTR": ["cephalosporin", "ceftriaxone"],
  "MTZ": ["metronidazole"],
  "CIP": ["fluoroquinolone", "ciprofloxacin"],
  "AML": [],
  "BIS": [],
  "ASP": ["aspirin", "NSAID", "salicylate"],
  "INS": [],
  "OND": ["ondansetron"],
  "MOR": ["morphine", "opioid"],
  "KCL": [],
  "RL": [],
};

export const DRUG_DIAGNOSIS_CONTRA: { drugCode: string; diagCodes: string[]; rationale: string }[] = [
  { drugCode: "ACE", diagCodes: ["I95"], rationale: "ACE inhibitors may worsen hypotension" },
  { drugCode: "ACE", diagCodes: ["N18"], rationale: "Monitor renal function with ACE inhibitor use in CKD" },
  { drugCode: "MET", diagCodes: ["N18"], rationale: "Metformin contraindicated in severe renal impairment" },
  { drugCode: "MET", diagCodes: ["E10"], rationale: "Monitor for lactic acidosis with Metformin in diabetics" },
  { drugCode: "ATR", diagCodes: ["K70", "K71", "K72", "K73", "K74"], rationale: "Statin use with caution in active liver disease" },
  { drugCode: "LVF", diagCodes: ["G40"], rationale: "Fluoroquinolones may lower seizure threshold" },
  { drugCode: "FUR", diagCodes: ["N18", "N19"], rationale: "Monitor renal function and electrolytes with furosemide" },
  { drugCode: "DIA", diagCodes: ["J45"], rationale: "Benzodiazepines may cause respiratory depression in severe asthma" },
  { drugCode: "AMX", diagCodes: ["B20"], rationale: "Monitor for rash in HIV patients on amoxicillin" },
  { drugCode: "CTR", diagCodes: ["N18", "N19"], rationale: "Ceftriaxone dose adjustment in severe renal impairment" },
  { drugCode: "MTZ", diagCodes: ["K70", "K71"], rationale: "Metronidazole metabolized by liver; caution in severe hepatic impairment" },
  { drugCode: "CIP", diagCodes: ["G40"], rationale: "Ciprofloxacin may lower seizure threshold" },
  { drugCode: "BIS", diagCodes: ["J45"], rationale: "Beta-blockers may exacerbate asthma" },
  { drugCode: "BIS", diagCodes: ["I50"], rationale: "Beta-blockers with caution in acute heart failure" },
  { drugCode: "ASP", diagCodes: ["K25", "K26", "K27", "K29"], rationale: "Aspirin may exacerbate peptic ulcer disease" },
  { drugCode: "INS", diagCodes: ["E10", "E11"], rationale: "Monitor blood glucose closely with insulin therapy" },
  { drugCode: "MOR", diagCodes: ["J45"], rationale: "Opioids may cause respiratory depression in severe asthma" },
  { drugCode: "KCL", diagCodes: ["N18", "N19"], rationale: "KCl administration with caution in renal impairment" },
];

export function getDoseRange(drugCode: string): { minMg: number; maxMg: number; maxDailyMg: number; unit: string } | null {
  const ranges: Record<string, { minMg: number; maxMg: number; maxDailyMg: number; unit: string }> = {
    "ACE": { minMg: 2.5, maxMg: 10, maxDailyMg: 20, unit: "mg" },
    "MET": { minMg: 250, maxMg: 500, maxDailyMg: 2000, unit: "mg" },
    "ATR": { minMg: 10, maxMg: 20, maxDailyMg: 80, unit: "mg" },
    "OMP": { minMg: 10, maxMg: 20, maxDailyMg: 40, unit: "mg" },
    "LVF": { minMg: 250, maxMg: 500, maxDailyMg: 750, unit: "mg" },
    "PRC": { minMg: 325, maxMg: 500, maxDailyMg: 3000, unit: "mg" },
    "HEP": { minMg: 20, maxMg: 40, maxDailyMg: 80, unit: "mg" },
    "SAL": { minMg: 0.1, maxMg: 0.2, maxDailyMg: 0.8, unit: "mg" },
    "FUR": { minMg: 20, maxMg: 40, maxDailyMg: 80, unit: "mg" },
    "DIA": { minMg: 2, maxMg: 5, maxDailyMg: 10, unit: "mg" },
    "AMX": { minMg: 250, maxMg: 500, maxDailyMg: 1500, unit: "mg" },
    "CTR": { minMg: 500, maxMg: 1000, maxDailyMg: 2000, unit: "mg" },
    "MTZ": { minMg: 250, maxMg: 500, maxDailyMg: 1500, unit: "mg" },
    "CIP": { minMg: 250, maxMg: 500, maxDailyMg: 1000, unit: "mg" },
    "AML": { minMg: 2.5, maxMg: 5, maxDailyMg: 10, unit: "mg" },
    "BIS": { minMg: 2.5, maxMg: 5, maxDailyMg: 10, unit: "mg" },
    "ASP": { minMg: 80, maxMg: 80, maxDailyMg: 160, unit: "mg" },
    "INS": { minMg: 2, maxMg: 10, maxDailyMg: 40, unit: "U" },
    "OND": { minMg: 2, maxMg: 4, maxDailyMg: 12, unit: "mg" },
    "MOR": { minMg: 2, maxMg: 10, maxDailyMg: 30, unit: "mg" },
    "KCL": { minMg: 10, maxMg: 20, maxDailyMg: 60, unit: "mEq" },
  };
  return ranges[drugCode] ?? null;
}

export function checkDrugAllergy(drugCode: string, patientAllergies: string[]): string | null {
  const allergens = MED_ALLERGEN_MAP[drugCode];
  if (!allergens || allergens.length === 0) return null;
  for (const a of allergens) {
    if (patientAllergies.some(pa => pa.toLowerCase().includes(a.toLowerCase()))) {
      return `Patient has documented allergy to ${a} (${drugCode})`;
    }
  }
  return null;
}

export function checkDiagnosisContraindication(drugCode: string, diagnoses: Diagnosis[]): { contraindicated: boolean; warnings: string[] } {
  const warnings: string[] = [];
  for (const contra of DRUG_DIAGNOSIS_CONTRA) {
    if (contra.drugCode !== drugCode) continue;
    for (const dx of diagnoses) {
      if (contra.diagCodes.some(code => dx.code.startsWith(code))) {
        warnings.push(contra.rationale);
      }
    }
  }
  return { contraindicated: warnings.length > 0, warnings };
}

export function checkDrugInteraction(
  newDrug: { code: string; name: string },
  existingMedications: Medication[],
): { severity: "none" | "minor" | "moderate" | "major" | "contraindicated"; description: string | null } {
  const INTERACTIONS: Record<string, Record<string, { severity: "minor" | "moderate" | "major" | "contraindicated"; desc: string }>> = {
    "ACE": {
      "DIA": { severity: "moderate", desc: "ACE inhibitors + Diazepam may potentiate hypotensive effects" },
      "FUR": { severity: "moderate", desc: "ACE inhibitors + Furosemide: monitor for hypotension and renal function" },
      "KCL": { severity: "major", desc: "ACE inhibitors + KCl: risk of hyperkalemia" },
    },
    "MET": {
      "FUR": { severity: "minor", desc: "Metformin + Furosemide may increase metformin levels" },
    },
    "LVF": {
      "DIA": { severity: "moderate", desc: "Fluoroquinolones + Diazepam may increase CNS effects" },
    },
    "FUR": {
      "ACE": { severity: "moderate", desc: "Furosemide + ACE inhibitors: monitor renal function" },
      "MET": { severity: "minor", desc: "Furosemide may increase Metformin levels" },
      "KCL": { severity: "moderate", desc: "Furosemide + KCl: monitor potassium levels" },
    },
    "DIA": {
      "ACE": { severity: "moderate", desc: "Diazepam + ACE inhibitors may potentiate hypotension" },
      "LVF": { severity: "moderate", desc: "Diazepam + Fluoroquinolones may increase CNS depression" },
      "MOR": { severity: "major", desc: "Diazepam + Morphine: risk of respiratory depression" },
    },
    "HEP": {
      "PRC": { severity: "moderate", desc: "Enoxaparin + Paracetamol: monitor for bleeding risk" },
      "ASP": { severity: "major", desc: "Enoxaparin + Aspirin: increased bleeding risk" },
    },
    "ASP": {
      "HEP": { severity: "major", desc: "Aspirin + Enoxaparin: increased bleeding risk" },
    },
    "MOR": {
      "DIA": { severity: "major", desc: "Morphine + Diazepam: risk of respiratory depression" },
    },
    "CIP": {
      "DIA": { severity: "moderate", desc: "Ciprofloxacin + Diazepam: increased CNS effects" },
    },
  };

  if (!INTERACTIONS[newDrug.code]) return { severity: "none", description: null };

  for (const existing of existingMedications) {
    const interaction = INTERACTIONS[newDrug.code]?.[existing.code];
    if (interaction) return { severity: interaction.severity, description: interaction.desc };
  }
  return { severity: "none", description: null };
}
