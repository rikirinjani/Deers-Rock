/**
 * INA-CBG (Indonesia Case-Based Groups) mapping.
 *
 * Each ICD-10 code maps to a Case Based Group (CBG) with a fixed all-inclusive
 * tariff covering room, drugs, procedures, and labs. Tariff based on
 * PMK 28/2020 (INA-CBG tariff table) for RS Tipe A, regional index 1.0.
 *
 * Payment is per episode — hospital profits if actual cost < tariff,
 * absorbs loss if actual cost > tariff.
 *
 * Reference: Permenkes No. 28/2020 tentang INA-CBG
 */

export interface CbgEntry {
  icdCode: string;
  cbgGroup: string;
  tariffIdr: number;
  description: string;
}

export const INA_CBG: CbgEntry[] = [
  // === Infectious Diseases ===
  { icdCode: "A01", cbgGroup: "I01A", tariffIdr: 4_200_000, description: "Typhoid fever, w/o CC" },
  { icdCode: "A09", cbgGroup: "I06A", tariffIdr: 3_100_000, description: "Infectious gastroenteritis, w/o CC" },
  { icdCode: "A15", cbgGroup: "I03A", tariffIdr: 8_500_000, description: "Tuberculosis, w/o CC" },
  { icdCode: "A27", cbgGroup: "I04A", tariffIdr: 6_800_000, description: "Leptospirosis, w/o CC" },
  { icdCode: "A41", cbgGroup: "I10A", tariffIdr: 12_000_000, description: "Sepsis, w MCC" },
  { icdCode: "A82", cbgGroup: "I15A", tariffIdr: 15_000_000, description: "Rabies, w/o CC" },
  { icdCode: "A91", cbgGroup: "I12A", tariffIdr: 7_200_000, description: "Dengue hemorrhagic fever" },
  { icdCode: "B20", cbgGroup: "I20A", tariffIdr: 9_500_000, description: "HIV disease w opportunistic infections" },
  { icdCode: "B50", cbgGroup: "I08A", tariffIdr: 5_500_000, description: "Malaria, severe" },
  { icdCode: "B86", cbgGroup: "I22A", tariffIdr: 2_800_000, description: "Scabies, w/o CC" },

  // === Neoplasms ===
  { icdCode: "C50", cbgGroup: "M01A", tariffIdr: 14_000_000, description: "Breast malignancy, w/o CC" },
  { icdCode: "C61", cbgGroup: "M02A", tariffIdr: 10_500_000, description: "Prostate malignancy, w/o CC" },

  // === Blood Disorders ===
  { icdCode: "D25", cbgGroup: "H01A", tariffIdr: 8_500_000, description: "Leiomyoma of uterus" },
  { icdCode: "D50", cbgGroup: "H02A", tariffIdr: 3_500_000, description: "Iron deficiency anemia" },
  { icdCode: "D64", cbgGroup: "H03A", tariffIdr: 4_200_000, description: "Anemia unspecified, w/o CC" },

  // === Endocrine ===
  { icdCode: "E05", cbgGroup: "E01A", tariffIdr: 5_800_000, description: "Hyperthyroidism, w/o CC" },
  { icdCode: "E10", cbgGroup: "E02A", tariffIdr: 5_200_000, description: "Type 1 diabetes mellitus" },
  { icdCode: "E11", cbgGroup: "E03A", tariffIdr: 4_800_000, description: "Type 2 diabetes mellitus, w/o CC" },
  { icdCode: "E66", cbgGroup: "E05A", tariffIdr: 3_800_000, description: "Obesity, w/o CC" },
  { icdCode: "E78", cbgGroup: "E04A", tariffIdr: 3_200_000, description: "Hyperlipidemia, w/o CC" },
  { icdCode: "E86", cbgGroup: "E06A", tariffIdr: 2_800_000, description: "Volume depletion / dehydration" },

  // === Mental Disorders ===
  { icdCode: "F32", cbgGroup: "F01A", tariffIdr: 5_500_000, description: "Major depressive disorder, single episode" },
  { icdCode: "F41", cbgGroup: "F02A", tariffIdr: 4_200_000, description: "Anxiety disorder, w/o CC" },

  // === Nervous System ===
  { icdCode: "G20", cbgGroup: "G01A", tariffIdr: 6_500_000, description: "Parkinson disease, w/o CC" },
  { icdCode: "G40", cbgGroup: "G02A", tariffIdr: 5_800_000, description: "Epilepsy, w/o CC" },
  { icdCode: "I63", cbgGroup: "B01A", tariffIdr: 14_500_000, description: "Cerebral infarction, w/o CC" },

  // === Circulatory ===
  { icdCode: "I10", cbgGroup: "B02A", tariffIdr: 3_500_000, description: "Essential hypertension, w/o CC" },
  { icdCode: "I21", cbgGroup: "B03A", tariffIdr: 18_000_000, description: "Acute myocardial infarction" },
  { icdCode: "I48", cbgGroup: "B04A", tariffIdr: 8_500_000, description: "Atrial fibrillation, w/o CC" },
  { icdCode: "I50", cbgGroup: "B05A", tariffIdr: 10_500_000, description: "Heart failure, w/o CC" },
  { icdCode: "I05", cbgGroup: "B06A", tariffIdr: 22_000_000, description: "Rheumatic heart disease, w CC" },
  { icdCode: "I83", cbgGroup: "B07A", tariffIdr: 3_200_000, description: "Varicose veins, w/o CC" },

  // === Respiratory ===
  { icdCode: "J12", cbgGroup: "C01A", tariffIdr: 6_200_000, description: "Viral pneumonia, w/o CC" },
  { icdCode: "J15", cbgGroup: "C02A", tariffIdr: 7_500_000, description: "Bacterial pneumonia, w/o CC" },
  { icdCode: "J18", cbgGroup: "C03A", tariffIdr: 5_800_000, description: "Pneumonia unspecified" },
  { icdCode: "J20", cbgGroup: "C04A", tariffIdr: 2_500_000, description: "Acute bronchitis, w/o CC" },
  { icdCode: "J32", cbgGroup: "C05A", tariffIdr: 3_800_000, description: "Chronic sinusitis, w/o CC" },
  { icdCode: "J44", cbgGroup: "C06A", tariffIdr: 6_500_000, description: "COPD, w/o CC" },
  { icdCode: "J45", cbgGroup: "C07A", tariffIdr: 3_500_000, description: "Asthma, w/o CC" },
  { icdCode: "J84", cbgGroup: "C08A", tariffIdr: 8_500_000, description: "Interstitial lung disease, w/o CC" },

  // === Digestive ===
  { icdCode: "K25", cbgGroup: "D01A", tariffIdr: 5_500_000, description: "Gastric ulcer, w/o CC" },
  { icdCode: "K29", cbgGroup: "D02A", tariffIdr: 3_200_000, description: "Gastritis, w/o CC" },
  { icdCode: "K35", cbgGroup: "D03A", tariffIdr: 10_500_000, description: "Acute appendicitis, w/o CC" },
  { icdCode: "K56", cbgGroup: "D04A", tariffIdr: 8_500_000, description: "Paralytic ileus, w/o CC" },
  { icdCode: "K80", cbgGroup: "D05A", tariffIdr: 12_000_000, description: "Cholelithiasis, w CC" },

  // === Musculoskeletal ===
  { icdCode: "M06", cbgGroup: "J01A", tariffIdr: 5_200_000, description: "Rheumatoid arthritis, w/o CC" },
  { icdCode: "M17", cbgGroup: "J02A", tariffIdr: 15_000_000, description: "Osteoarthritis of knee" },
  { icdCode: "M54", cbgGroup: "J03A", tariffIdr: 4_500_000, description: "Low back pain, w/o CC" },
  { icdCode: "M81", cbgGroup: "J04A", tariffIdr: 3_800_000, description: "Osteoporosis, w/o CC" },

  // === Skin ===
  { icdCode: "L03", cbgGroup: "K01A", tariffIdr: 3_500_000, description: "Cellulitis, w/o CC" },
  { icdCode: "L40", cbgGroup: "K02A", tariffIdr: 2_800_000, description: "Psoriasis, w/o CC" },

  // === Genitourinary ===
  { icdCode: "N13", cbgGroup: "L01A", tariffIdr: 4_500_000, description: "Obstructive uropathy, w/o CC" },
  { icdCode: "N18", cbgGroup: "L02A", tariffIdr: 6_500_000, description: "Chronic kidney disease, w/o CC" },
  { icdCode: "N20", cbgGroup: "L03A", tariffIdr: 4_800_000, description: "Renal colic / kidney stone" },
  { icdCode: "N39", cbgGroup: "L04A", tariffIdr: 3_200_000, description: "Urinary tract infection, w/o CC" },
  { icdCode: "N40", cbgGroup: "L05A", tariffIdr: 6_500_000, description: "BPH, w/o CC" },
  { icdCode: "N76", cbgGroup: "L06A", tariffIdr: 2_500_000, description: "Vulvovaginitis, w/o CC" },

  // === Pregnancy & Neonatal ===
  { icdCode: "O20", cbgGroup: "O01A", tariffIdr: 4_500_000, description: "Threatened abortion" },
  { icdCode: "O80", cbgGroup: "O02A", tariffIdr: 6_800_000, description: "Single spontaneous delivery" },
  { icdCode: "P07", cbgGroup: "P01A", tariffIdr: 12_000_000, description: "Preterm newborn, w/o CC" },
  { icdCode: "P36", cbgGroup: "P02A", tariffIdr: 10_500_000, description: "Neonatal sepsis" },
  { icdCode: "P59", cbgGroup: "P03A", tariffIdr: 4_200_000, description: "Neonatal jaundice" },
  { icdCode: "Q21", cbgGroup: "P04A", tariffIdr: 25_000_000, description: "Congenital heart disease" },

  // === Trauma & External ===
  { icdCode: "S06", cbgGroup: "T01A", tariffIdr: 18_000_000, description: "Intracranial injury, w/o CC" },
  { icdCode: "S72", cbgGroup: "T02A", tariffIdr: 16_000_000, description: "Fracture of femur" },
  { icdCode: "T14", cbgGroup: "T03A", tariffIdr: 3_800_000, description: "Open wound, w/o CC" },
  { icdCode: "T20", cbgGroup: "T04A", tariffIdr: 12_000_000, description: "Burns, 2nd degree, w/o CC" },
  { icdCode: "T63", cbgGroup: "T05A", tariffIdr: 8_500_000, description: "Snake bite envenomation" },

  // === Septic Shock ===
  { icdCode: "R57", cbgGroup: "I11A", tariffIdr: 22_000_000, description: "Septic shock" },

  // === ENT ===
  { icdCode: "H66", cbgGroup: "H03A", tariffIdr: 3_200_000, description: "Otitis media, w/o CC" },

  // === Congenital (extra) ===
  { icdCode: "E11.5", cbgGroup: "E03B", tariffIdr: 7_500_000, description: "Type 2 diabetes w diabetic foot" },
];

/**
 * Look up INA-CBG tariff for an ICD code.
 * Returns undefined if code not found.
 */
export function lookupCbgTariff(icdCode: string): CbgEntry | undefined {
  return INA_CBG.find(e => e.icdCode === icdCode);
}

/**
 * Get all unique CBG groups.
 */
export function listCbgGroups(): string[] {
  return [...new Set(INA_CBG.map(e => e.cbgGroup))];
}
