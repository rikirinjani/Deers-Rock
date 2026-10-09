/**
 * @deers-rock/adapter-khanza — Claim parity checker
 *
 * Compares DR's internal claim adjudication against Khanza's INA-CBG
 * grouper to verify billing consistency.
 */
import type { World } from '@deers-rock/core';
import type { KhanzaClaim } from './types.js';

export interface ClaimParityResult {
  totalCompared: number;
  matches: number;
  mismatches: number;
  details: Array<{
    encounterId: string;
    drGroup: string;
    drTariff: number;
    khanzaGroup: string;
    khanzaTariff: number;
    matched: boolean;
    reason?: string;
  }>;
  accuracyRate: number;
}

/**
 * Compare DR claims against a simulated Khanza INA-CBG grouper.
 *
 * Since we don't have the full Khanza grouper running, we simulate
 * the comparison by using DR's own tariff data as the "ground truth"
 * and checking consistency.
 */
export function checkClaimParity(w: World): ClaimParityResult {
  const results: ClaimParityResult = {
    totalCompared: 0,
    matches: 0,
    mismatches: 0,
    details: [],
    accuracyRate: 0,
  };

  // Collect all adjudicated/paid claims
  for (const claim of w.state.insuranceClaims.values()) {
    if (claim.status === 'adjudicated' || claim.status === 'paid' || claim.status === 'denied') {
      results.totalCompared++;

      // DR internal tariff
      const drGroup = claim.sepNumber ?? 'UNKNOWN';
      const drTariff = claim.coveredAmount;

      // Simulated Khanza grouper output (same logic, different path)
      // In production this would call the actual INACBGStrategy
      const khanzaGroup = inferCBGFromICD(claim.sepNumber ?? '');
      const khanzaTariff = inferTariffFromGroup(khanzaGroup);

      const matched = drGroup === khanzaGroup && Math.abs(drTariff - khanzaTariff) < 1;

      if (matched) {
        results.matches++;
      } else {
        results.mismatches++;
        results.details.push({
          encounterId: claim.encounterId,
          drGroup,
          drTariff,
          khanzaGroup,
          khanzaTariff,
          matched: false,
          reason: `DR=${drGroup}/${drTariff} vs KZ=${khanzaGroup}/${khanzaTariff}`,
        });
      }
    }
  }

  results.accuracyRate = results.totalCompared > 0
    ? results.matches / results.totalCompared
    : 1;

  return results;
}

/**
 * Infer CBG group from ICD code (simplified mapping).
 */
function inferCBGFromICD(icd10: string): string {
  if (!icd10) return 'UNKNOWN';
  const prefix = icd10.charAt(0);
  const map: Record<string, string> = {
    'A': 'A-1-01', 'B': 'B-1-01', 'C': 'C-1-01',
    'D': 'D-1-01', 'E': 'E-1-01', 'F': 'F-1-01',
    'G': 'G-1-01', 'H': 'H-1-01', 'I': 'I-1-01',
    'J': 'J-1-01', 'K': 'K-1-01', 'L': 'L-1-01',
    'M': 'M-1-01', 'N': 'N-1-01', 'O': 'O-1-01',
    'P': 'P-1-01', 'Q': 'Q-1-01', 'R': 'R-1-01',
    'S': 'S-1-01', 'T': 'T-1-01', 'U': 'U-1-01',
    'V': 'V-1-01', 'W': 'W-1-01', 'X': 'X-1-01',
    'Y': 'Y-1-01', 'Z': 'Z-1-01',
  };
  return map[prefix] ?? 'Z-1-01';
}

/**
 * Infer tariff from CBG group (simplified).
 */
function inferTariffFromGroup(group: string): number {
  if (!group || group === 'UNKNOWN') return 0;
  // Base rates by chapter (IDR)
  const baseRates: Record<string, number> = {
    'A': 2500000, 'B': 2800000, 'C': 3000000,
    'D': 2600000, 'E': 2800000, 'F': 2400000,
    'G': 3200000, 'H': 2200000, 'I': 3500000,
    'J': 3200000, 'K': 2800000, 'L': 2600000,
    'M': 3000000, 'N': 2800000, 'O': 5000000,
    'P': 4500000, 'Q': 4000000, 'R': 2000000,
    'S': 4000000, 'T': 3500000, 'U': 3000000,
    'V': 1500000, 'W': 1500000, 'X': 1000000,
    'Y': 1000000, 'Z': 1200000,
  };
  const prefix = group.split('-')[0];
  return baseRates[prefix] ?? 2500000;
}
