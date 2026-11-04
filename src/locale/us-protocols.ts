/**
 * US clinical protocol overrides (Epic X M10.5b slice 5): for the ICD-10
 * categories where US practice differs from the engine's Indonesian
 * protocols, the order set the US protocol replaces them with. Categories
 * without an override keep the shared protocol.
 *
 * These are simulation order sets modelled on public US guidance (Surviving
 * Sepsis 1-hour bundle, ACC/AHA ACS and heart-failure therapy, ATS/IDSA
 * community-acquired pneumonia, GOLD COPD exacerbation, ADA diabetes
 * standards of care). They are NOT clinical decision support: the engine
 * orders by diagnosis alone, so conditional steps (e.g. thrombolysis
 * eligibility, antibiotic choice by severity) are left out; allergy-conditional
 * alternatives are declared per action (ifAllergic) where US practice has one.
 * Clinical review of each order set belongs to Research OC (M10.5c).
 *
 * Labels resolve against the engine's catalogue or the US drug extension
 * (us-drugs.ts); lab and imaging labels that the engine cannot order
 * (e.g. "Lactate") state intent and are skipped, as in the shared protocols.
 */
import type { ClinicalAction } from "../engine/clinical-knowledge.js";
import type { IProtocolSet } from "./contracts.js";

const SEPSIS_BUNDLE: ClinicalAction[] = [
  { type: "lab", label: "Blood culture", priority: 10, detail: "blood_culture" },
  { type: "lab", label: "Lactate", priority: 10, detail: "lactate" },
  { type: "medication", label: "Piperacillin-tazobactam 4.5g", priority: 10, detail: "Broad-spectrum antibiotic within 1 hour", ifAllergic: { label: "Meropenem 500mg", detail: "Carbapenem for penicillin allergy" } },
  { type: "medication", label: "Vancomycin 500mg", priority: 9, detail: "MRSA coverage" },
  { type: "medication", label: "Ringer's Lactate IV", priority: 10, detail: "Crystalloid 30 mL/kg for hypotension or lactate >= 4" },
  { type: "lab", label: "Complete Blood Count", priority: 9, detail: "CBC" },
  { type: "lab", label: "Basic Metabolic Panel", priority: 8, detail: "BMP" },
  { type: "respiratory", label: "Oxygen therapy", priority: 8, detail: "oxygen" },
];

export const US_PROTOCOL_OVERRIDES: Readonly<Record<string, readonly ClinicalAction[]>> = {
  // Surviving Sepsis 1-hour bundle (the shared protocols use ceftriaxone/levofloxacin)
  A40: [...SEPSIS_BUNDLE, { type: "medication", label: "Penicillin G 1MU", priority: 8, detail: "Streptococcal coverage" }],
  A49: SEPSIS_BUNDLE,
  // ACS: dual antiplatelet, parenteral anticoagulant, beta-blocker, high-intensity statin
  I21: [
    { type: "imaging", label: "ECG", priority: 10, detail: "ecg" },
    { type: "lab", label: "Troponin I", priority: 10, detail: "TROP" },
    { type: "medication", label: "Aspirin 80mg", priority: 10, detail: "Antiplatelet", ifAllergic: { label: "Clopidogrel 75mg", detail: "P2Y12 inhibitor for aspirin allergy" } },
    { type: "medication", label: "Clopidogrel 75mg", priority: 9, detail: "P2Y12 inhibitor" },
    { type: "medication", label: "Heparin 5000IU/ml", priority: 9, detail: "Anticoagulant" },
    { type: "medication", label: "Metoprolol 50mg", priority: 8, detail: "Beta-blocker" },
    { type: "medication", label: "Atorvastatin 20mg", priority: 8, detail: "High-intensity statin" },
    { type: "medication", label: "Nitroglycerin 0.5mg", priority: 7, detail: "Ongoing ischaemic pain" },
    { type: "lab", label: "Complete Blood Count", priority: 8, detail: "CBC" },
    { type: "consult", label: "Jantung", priority: 10, detail: "cardiology (catheterization)" },
  ],
  // Stroke: imaging first; thrombolysis is eligibility-dependent so it is not auto-ordered
  I63: [
    { type: "imaging", label: "CT Head without contrast", priority: 10, detail: "CT" },
    { type: "lab", label: "Basic Metabolic Panel", priority: 9, detail: "BMP (glucose)" },
    { type: "medication", label: "Aspirin 80mg", priority: 8, detail: "Antiplatelet", ifAllergic: { label: "Clopidogrel 75mg", detail: "P2Y12 inhibitor for aspirin allergy" } },
    { type: "medication", label: "Atorvastatin 20mg", priority: 7, detail: "High-intensity statin" },
    { type: "consult", label: "Saraf", priority: 10, detail: "neurology (stroke team)" },
    { type: "consult", label: "Rehabilitasi Medik", priority: 6, detail: "rehab_medik" },
  ],
  // Community-acquired pneumonia, inpatient: beta-lactam plus macrolide
  J15: [
    { type: "medication", label: "Ceftriaxone 1g", priority: 9, detail: "Beta-lactam", ifAllergic: { label: "Levofloxacin 500mg", detail: "Respiratory fluoroquinolone for cephalosporin allergy" } },
    { type: "medication", label: "Azithromycin 250mg", priority: 9, detail: "Macrolide (atypical coverage)" },
    { type: "lab", label: "Complete Blood Count", priority: 8, detail: "CBC" },
    { type: "lab", label: "C-Reactive Protein", priority: 7, detail: "CRP" },
    { type: "imaging", label: "Chest X-ray PA & Lateral", priority: 9, detail: "X-ray" },
    { type: "respiratory", label: "Oxygen therapy", priority: 6, detail: "oxygen" },
  ],
  J18: [
    { type: "medication", label: "Ceftriaxone 1g", priority: 9, detail: "Beta-lactam", ifAllergic: { label: "Levofloxacin 500mg", detail: "Respiratory fluoroquinolone for cephalosporin allergy" } },
    { type: "medication", label: "Azithromycin 250mg", priority: 9, detail: "Macrolide (atypical coverage)" },
    { type: "lab", label: "Complete Blood Count", priority: 8, detail: "CBC" },
    { type: "imaging", label: "Chest X-ray PA & Lateral", priority: 9, detail: "X-ray" },
    { type: "respiratory", label: "Oxygen therapy", priority: 6, detail: "oxygen" },
  ],
  // Heart failure: diuretic plus guideline-directed therapy
  I50: [
    { type: "medication", label: "Furosemide 40mg", priority: 9, detail: "Loop diuretic" },
    { type: "medication", label: "Losartan 50mg", priority: 8, detail: "ARB" },
    { type: "medication", label: "Metoprolol 50mg", priority: 8, detail: "Evidence-based beta-blocker" },
    { type: "medication", label: "Spironolactone 25mg", priority: 7, detail: "MRA" },
    { type: "medication", label: "Empagliflozin 10mg", priority: 7, detail: "SGLT2 inhibitor" },
    { type: "lab", label: "Basic Metabolic Panel", priority: 8, detail: "BMP" },
    { type: "imaging", label: "Chest X-ray PA & Lateral", priority: 8, detail: "X-ray" },
    { type: "diet", label: "Cardiac diet", priority: 6, detail: "cardiac" },
    { type: "consult", label: "Jantung", priority: 6, detail: "cardiology" },
  ],
  // Atrial fibrillation: rate control and a DOAC rather than enoxaparin
  I48: [
    { type: "lab", label: "Basic Metabolic Panel", priority: 7, detail: "BMP" },
    { type: "medication", label: "Metoprolol 50mg", priority: 9, detail: "Rate control" },
    { type: "medication", label: "Apixaban 5mg", priority: 9, detail: "Anticoagulation (DOAC)" },
    { type: "consult", label: "Jantung", priority: 8, detail: "cardiology" },
  ],
  // COPD exacerbation: bronchodilators, systemic steroid
  J44: [
    { type: "respiratory", label: "Oxygen therapy", priority: 9, detail: "oxygen (titrate to SpO2 88-92 %)" },
    { type: "respiratory", label: "Nebulizer therapy", priority: 8, detail: "nebulizer" },
    { type: "medication", label: "Salbutamol Inhaler", priority: 9, detail: "Short-acting beta-agonist" },
    { type: "medication", label: "Ipratropium bromide neb", priority: 8, detail: "Short-acting anticholinergic" },
    { type: "medication", label: "Prednisone 5mg", priority: 8, detail: "Systemic corticosteroid" },
    { type: "imaging", label: "Chest X-ray PA & Lateral", priority: 6, detail: "X-ray" },
    { type: "lab", label: "Complete Blood Count", priority: 5, detail: "CBC" },
  ],
  // UTI: fluoroquinolones are no longer first line for uncomplicated infection
  N39: [
    { type: "lab", label: "Urinalysis", priority: 9, detail: "UA" },
    { type: "medication", label: "Ceftriaxone 1g", priority: 8, detail: "Antibiotic for UTI", ifAllergic: { label: "Ciprofloxacin 500mg", detail: "Fluoroquinolone for cephalosporin allergy" } },
    { type: "lab", label: "Complete Blood Count", priority: 6, detail: "CBC" },
  ],
  // Type 2 diabetes: metformin plus an SGLT2 inhibitor, statin
  E11: [
    { type: "medication", label: "Metformin 500mg", priority: 9, detail: "First-line" },
    { type: "medication", label: "Empagliflozin 10mg", priority: 7, detail: "SGLT2 inhibitor (cardio-renal benefit)" },
    { type: "medication", label: "Atorvastatin 20mg", priority: 6, detail: "Statin" },
    { type: "lab", label: "Hemoglobin A1C", priority: 8, detail: "HBA1C" },
    { type: "lab", label: "Basic Metabolic Panel", priority: 7, detail: "BMP" },
    { type: "diet", label: "Diabetic diet", priority: 6, detail: "diabetic" },
  ],
};

export class USProtocolSet implements IProtocolSet {
  config = { countryCode: "US", displayName: "United States" };
  overrides(code: string): readonly ClinicalAction[] | undefined { return US_PROTOCOL_OVERRIDES[code]; }
}
