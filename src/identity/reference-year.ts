/**
 * Fixed simulation reference year for deriving birth years and ages. The
 * simulation never reads the wall clock, so results do not change when the
 * calendar year does. (Epic X M10.5b prerequisite: age fix, clinical-v2.)
 */
export const SIM_REFERENCE_YEAR = 2026;

/**
 * Age in whole years from an identity birth date, in either the Indonesian
 * "dd/mm/yyyy" or the ISO "yyyy-mm-dd" form (year only, relative to
 * SIM_REFERENCE_YEAR).
 */
export function ageFromBirthDate(birthDate: string): number {
  const parts = birthDate.includes("/") ? birthDate.split("/") : birthDate.split("-");
  const year = parseInt(birthDate.includes("/") ? parts[2]! : parts[0]!, 10);
  return SIM_REFERENCE_YEAR - year;
}
