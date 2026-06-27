import type { Vitals, Diagnosis } from "../patient/schema.js";

export interface NursingProtocol {
  icdCodes: string[];
  assessmentFocus: string[];
  interventions: string[];
  monitoringFrequency: string;
}

export interface VitalsAlert {
  param: keyof Vitals;
  condition: "gt" | "lt" | "gte" | "lte";
  threshold: number;
  severity: "info" | "warning" | "critical";
  nursingConcern: string;
  nursingAction: string;
}

export const NURSING_PROTOCOLS: NursingProtocol[] = [
  { icdCodes: ["I10", "E78"], assessmentFocus: ["BP monitoring", "Cardiovascular assessment", "Medication compliance", "Dietary adherence"],
    interventions: ["Monitor BP q4h", "Educate on low-sodium diet", "Encourage medication compliance", "Monitor for dizziness/syncope"],
    monitoringFrequency: "q4h" },
  { icdCodes: ["E11"], assessmentFocus: ["Blood glucose monitoring", "Foot assessment", "Dietary compliance", "Skin integrity"],
    interventions: ["CBG monitoring AC/HS", "Foot inspection daily", "Insulin administration per sliding scale", "Patient education on diabetic diet"],
    monitoringFrequency: "q2h" },
  { icdCodes: ["J15", "J18"], assessmentFocus: ["Respiratory assessment", "O2 saturation monitoring", "Cough/Sputum character", "Breath sounds"],
    interventions: ["Monitor SpO2 continuous", "Encourage deep breathing/coughing", "Elevate HOB 30 degrees", "Assist with incentive spirometry q1h"],
    monitoringFrequency: "q1h" },
  { icdCodes: ["J44", "J45"], assessmentFocus: ["Respiratory effort", "Wheezing assessment", "Inhaler technique", "O2 therapy monitoring"],
    interventions: ["Monitor O2 saturation", "Administer nebulizer PRN", "Teach pursed-lip breathing", "Position for optimal breathing"],
    monitoringFrequency: "q2h" },
  { icdCodes: ["I50"], assessmentFocus: ["Fluid balance I/O", "Weight daily", "Edema assessment", "Respiratory status", "Medication response"],
    interventions: ["Strict I/O charting", "Daily weight before breakfast", "Assess for JVD/peripheral edema", "Monitor for dyspnea on exertion"],
    monitoringFrequency: "q2h" },
  { icdCodes: ["N39", "N20"], assessmentFocus: ["Urine output monitoring", "Pain assessment", "Fever monitoring", "Hydration status"],
    interventions: ["Monitor urine color/volume", "Encourage increased PO intake", "Monitor temperature q4h", "Assist with ambulation to bathroom"],
    monitoringFrequency: "q4h" },
  { icdCodes: ["K29", "A09", "E86"], assessmentFocus: ["GI assessment", "Hydration status", "Diet tolerance", "Emesis/diarrhea monitoring"],
    interventions: ["Monitor I/O strictly", "Assess for signs of dehydration", "Advance diet as tolerated", "Administer antiemetics PRN"],
    monitoringFrequency: "q4h" },
  { icdCodes: ["I21"], assessmentFocus: ["Chest pain monitoring", "ECG monitoring", "Vital sign stability", "Activity tolerance"],
    interventions: ["Cardiac monitoring continuous", "Monitor for chest pain recurrence", "Assist with ADLs", "Nitroglycerin SL PRN chest pain"],
    monitoringFrequency: "q1h" },
  { icdCodes: ["I63", "G40"], assessmentFocus: ["Neurological assessment", "Seizure precautions", "Mobility assessment", "Swallow evaluation"],
    interventions: ["Neuro checks q4h", "Seizure precautions in place", "Fall risk assessment", "Assist with feeding if dysphagia"],
    monitoringFrequency: "q2h" },
  { icdCodes: ["O80", "O20", "D25"], assessmentFocus: ["Vaginal bleeding monitoring", "Fetal assessment", "Pain assessment", "Emotional support"],
    interventions: ["Monitor for bleeding", "VS q4h", "Provide emotional support", "Report excessive bleeding immediately"],
    monitoringFrequency: "q4h" },
  { icdCodes: ["S72", "M17", "M54"], assessmentFocus: ["Pain assessment", "Neurovascular status", "Mobility assistance", "Wound/surgical site"],
    interventions: ["Pain assessment q4h", "Neurovascular checks q2h", "Assist with repositioning q2h", "Fall prevention measures"],
    monitoringFrequency: "q2h" },
  { icdCodes: ["K35", "K80"], assessmentFocus: ["Abdominal assessment", "Pain monitoring", "NPO status", "Surgical preparation"],
    interventions: ["NPO per orders", "Monitor for signs of peritonitis", "VS monitoring", "Prepare for OR"],
    monitoringFrequency: "q2h" },
  { icdCodes: ["N18", "E05", "B20"], assessmentFocus: ["Metabolic monitoring", "Medication compliance", "Infection prevention", "Nutritional status"],
    interventions: ["Monitor for electrolyte imbalance", "Strict I/O", "Daily weight", "Educate on disease management"],
    monitoringFrequency: "q4h" },
  { icdCodes: ["F32"], assessmentFocus: ["Mental status assessment", "Suicide precautions", "Medication compliance", "Therapeutic communication"],
    interventions: ["Suicide precautions per protocol", "Encourage group therapy participation", "Monitor sleep patterns", "Ensure medication compliance"],
    monitoringFrequency: "q4h" },
  { icdCodes: ["P07", "H66", "J20"], assessmentFocus: ["Pediatric assessment", "Growth monitoring", "Feeding assessment", "Parent education"],
    interventions: ["Pediatric VS per protocol", "Monitor feeding tolerance", "Weight daily", "Parent education on home care"],
    monitoringFrequency: "q2h" },
  { icdCodes: ["C50", "C61"], assessmentFocus: ["Oncologic assessment", "Pain management", "Wound care", "Emotional support"],
    interventions: ["Pain management per protocol", "Wound care if post-op", "Provide psychosocial support", "Coordinate with oncology team"],
    monitoringFrequency: "q4h" },
  { icdCodes: ["T14", "L03", "S06"], assessmentFocus: ["Wound assessment", "Infection signs", "Neurological status", "Pain level"],
    interventions: ["Wound care per orders", "Monitor for infection signs", "Tetanus status verification", "Pain management"],
    monitoringFrequency: "q4h" },
  { icdCodes: ["M81", "D64"], assessmentFocus: ["Fall risk assessment", "Nutritional status", "Mobility assessment", "Skin integrity"],
    interventions: ["Fall risk screening", "Encourage nutrition", "Assist with mobility", "Skin assessment daily"],
    monitoringFrequency: "q8h" },
  { icdCodes: ["N40", "A15", "E86"], assessmentFocus: ["Elimination assessment", "Respiratory precautions", "Hydration status", "Comfort measures"],
    interventions: ["Monitor voiding pattern", "Respiratory isolation per protocol", "Encourage fluids", "Comfort measures PRN"],
    monitoringFrequency: "q4h" },
  { icdCodes: ["A41", "R57"], assessmentFocus: ["Sepsis screening qSOFA", "Hemodynamic monitoring", "Temperature q2h", "Lactate clearance"],
    interventions: ["qSOFA assessment every shift", "Monitor MAP > 65 mmHg", "Blood cultures per orders", "Broad spectrum antibiotic administration", "Fluid resuscitation monitoring"],
    monitoringFrequency: "q1h" },
  { icdCodes: ["I48"], assessmentFocus: ["Heart rhythm monitoring", "Bleeding precautions", "Anticoagulation education", "Fall prevention"],
    interventions: ["Telemetry monitoring continuous", "INR monitoring if on warfarin", "Educate on anticoagulation therapy", "Fall risk assessment"],
    monitoringFrequency: "q4h" },
  { icdCodes: ["J12", "J84"], assessmentFocus: ["Respiratory assessment", "O2 therapy monitoring", "Activity tolerance", "Breath sounds auscultation"],
    interventions: ["Continuous SpO2 monitoring", "Chest physiotherapy PRN", "Monitor for increased work of breathing", "Encourage pulmonary hygiene"],
    monitoringFrequency: "q2h" },
  { icdCodes: ["E10", "E66"], assessmentFocus: ["Blood glucose monitoring", "Dietary compliance", "Weight management", "Complication screening"],
    interventions: ["CBG monitoring AC/HS", "Dietary consultation referral", "Daily weight", "Foot and skin assessment daily"],
    monitoringFrequency: "q2h" },
  { icdCodes: ["K25", "K56"], assessmentFocus: ["GI assessment", "Bowel sounds", "Pain monitoring", "NPO status if applicable"],
    interventions: ["Monitor for GI bleeding (melena/hematemesis)", "Bowel sound auscultation q4h", "Pain management per protocol", "Advance diet as tolerated"],
    monitoringFrequency: "q2h" },
  { icdCodes: ["M06", "M81"], assessmentFocus: ["Joint pain assessment", "Mobility assistance", "Medication compliance", "Fall prevention"],
    interventions: ["Pain assessment q4h", "Assist with ADLs", "Joint protection techniques education", "Fall prevention measures in place"],
    monitoringFrequency: "q4h" },
  { icdCodes: ["F41", "G20"], assessmentFocus: ["Safety assessment", "Mobility assessment", "Medication administration", "Emotional support"],
    interventions: ["Fall risk assessment", "Assist with ambulation", "Medication administration per schedule", "Provide calm environment"],
    monitoringFrequency: "q4h" },
  { icdCodes: ["P59", "Q21"], assessmentFocus: ["Pediatric assessment", "Feeding tolerance", "Oxygenation monitoring", "Parent education"],
    interventions: ["Monitor for feeding difficulties", "O2 saturation monitoring continuous", "Parent education on condition", "Coordinate with pediatric specialist"],
    monitoringFrequency: "q2h" },
  { icdCodes: ["N76", "N13"], assessmentFocus: ["Elimination assessment", "Pain assessment", "Hydration status", "Infection prevention"],
    interventions: ["Monitor urine output", "Pain management per protocol", "Encourage PO intake", "Perineal care education"],
    monitoringFrequency: "q4h" },
  { icdCodes: ["L40", "D50"], assessmentFocus: ["Skin assessment", "Pain management", "Nutritional support", "Patient education"],
    interventions: ["Skin integrity assessment daily", "Emollient therapy per orders", "Iron supplementation education", "Dermatology referral coordination"],
    monitoringFrequency: "q8h" },
  { icdCodes: ["I83", "L03"], assessmentFocus: ["Wound/skin assessment", "Pain monitoring", "Infection signs", "Mobility assessment"],
    interventions: ["Monitor for signs of infection", "Elevate affected extremity", "Pain assessment q4h", "Compression therapy if ordered"],
    monitoringFrequency: "q4h" },
  { icdCodes: ["J32", "H66"], assessmentFocus: ["ENT assessment", "Pain monitoring", "Fever monitoring", "Hearing assessment"],
    interventions: ["Monitor for ear/sinus pain", "Warm compress PRN", "Monitor temperature q6h", "Hearing conservation education"],
    monitoringFrequency: "q6h" },
];

export function getNursingProtocols(diagnoses: Diagnosis[]): NursingProtocol | null {
  const codes = diagnoses.filter(d => d.active).map(d => d.code);
  for (const p of NURSING_PROTOCOLS) {
    if (p.icdCodes.some(c => codes.includes(c))) return p;
  }
  return null;
}

export function getNursingAssessment(diagnoses: Diagnosis[]): string[] {
  const p = getNursingProtocols(diagnoses);
  if (!p) return ["General nursing assessment", "VS monitoring", "Patient comfort", "Safety checks"];
  return p.assessmentFocus;
}

export function getNursingInterventions(diagnoses: Diagnosis[]): string[] {
  const p = getNursingProtocols(diagnoses);
  if (!p) return ["Monitor vitals", "Provide comfort measures", "Ensure patient safety"];
  return p.interventions;
}

export function generateNurseNote(diagnoses: Diagnosis[], vitals: Vitals, noteType: string): string {
  const p = getNursingProtocols(diagnoses);
  const focus = p?.assessmentFocus ?? ["General nursing assessment", "VS monitoring"];

  const vitalsNote = formatVitals(vitals);
  const assessment = focus[Math.floor(Math.random() * focus.length)]!;

  if (noteType === "assessment") {
    return `Nursing assessment: ${assessment}. ${vitalsNote}. Patient appears ${Math.random() > 0.3 ? "stable" : "in mild distress"}. Care plan initiated per ${p?.monitoringFrequency ?? "protocol"}.`;
  }
  if (noteType === "procedure") {
    const proc = ["Wound dressing changed, wound clean and dry", "IV line inserted, site clean and intact", "Foley catheter inserted, draining clear urine", "NGT placed, position confirmed", "Blood draw from peripheral line, specimen sent"][Math.floor(Math.random() * 5)]!;
    return `Procedure: ${proc}. Patient tolerated well. ${vitalsNote}`;
  }
  if (noteType === "observation") {
    const obs = getVitalsConcern(vitals);
    if (obs) return `⚠️ ${obs.concern}. ${obs.action}. ${vitalsNote}`;
    return `Routine observation: ${assessment}. ${vitalsNote}. No acute changes noted.`;
  }
  const intervention = p?.interventions[Math.floor(Math.random() * (p?.interventions.length ?? 1))];
  return `Nursing round: ${assessment}. ${intervention ?? "Comfort measures provided"}. ${vitalsNote}. Patient resting comfortably.`;
}

export interface VitalsConcern {
  concern: string;
  action: string;
}

function getVitalsConcern(vitals: Vitals): VitalsConcern | null {
  if (vitals.oxygenSaturation < 90) return { concern: "Hypoxia — SpO2 below 90%", action: "Increase O2, notify doctor immediately" };
  if (vitals.oxygenSaturation < 94) return { concern: "Mild desaturation SpO2 " + vitals.oxygenSaturation + "%", action: "Check O2 delivery, reposition patient" };
  if (vitals.heartRate > 110) return { concern: "Tachycardia HR " + vitals.heartRate, action: "Assess for pain/anxiety/fever, notify if persistent" };
  if (vitals.heartRate < 55) return { concern: "Bradycardia HR " + vitals.heartRate, action: "Assess for dizziness, check medications" };
  if (vitals.bloodPressureSystolic > 170) return { concern: "Severe hypertension " + vitals.bloodPressureSystolic + "/" + vitals.bloodPressureDiastolic, action: "Hold antihypertensives per protocol, notify doctor" };
  if (vitals.bloodPressureSystolic < 90) return { concern: "Hypotension " + vitals.bloodPressureSystolic, action: "Trendelenburg position, bolus fluids per orders" };
  if (vitals.temperature > 38.5) return { concern: "Fever " + vitals.temperature + "°C", action: "Antipyretic per orders, blood cultures if ordered" };
  if (vitals.temperature < 35.5) return { concern: "Hypothermia " + vitals.temperature + "°C", action: "Warm blankets, warm IV fluids" };
  if (vitals.painLevel >= 7) return { concern: "Severe pain " + vitals.painLevel + "/10", action: "Pain medication per orders, reassess in 30 min" };
  if (vitals.respiratoryRate > 26) return { concern: "Tachypnea RR " + vitals.respiratoryRate, action: "Assess breath sounds, check O2 sat, notify doctor" };
  return null;
}

function formatVitals(v: Vitals): string {
  return `VS: BP ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic} HR ${v.heartRate} RR ${v.respiratoryRate} SpO2 ${v.oxygenSaturation}% T ${v.temperature}°C Pain ${v.painLevel}/10`;
}
