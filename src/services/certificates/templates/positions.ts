/**
 * Certificate achievements (what the "POSITION" row ticks). Adding a type is
 * one entry here — templates list which codes they print, the renderer draws
 * whatever this registry describes, and issued certificates store the code
 * plus a snapshot of the printed labels.
 */
export interface CertificateAchievement {
  code: string;
  /** Human label used in admin screens, the player vault and verification. */
  label: string;
  /**
   * How it is printed in the position row: `main` with an optional raised
   * `superscript` between `prefix` and `main`, e.g. 1 + "ST" + " PLACE".
   */
  print: { prefix: string; superscript?: string; main: string };
}

export const CERTIFICATE_ACHIEVEMENTS: readonly CertificateAchievement[] = [
  { code: "FIRST_PLACE", label: "1st Place", print: { prefix: "1", superscript: "ST", main: " PLACE" } },
  { code: "SECOND_PLACE", label: "2nd Place", print: { prefix: "2", superscript: "ND", main: " PLACE" } },
  { code: "THIRD_PLACE", label: "3rd Place", print: { prefix: "3", superscript: "RD", main: " PLACE" } },
  { code: "PARTICIPATION", label: "Participation", print: { prefix: "", main: "PARTICIPATION AS PLAYER" } },
];

export const DEFAULT_ACHIEVEMENT = "PARTICIPATION";

export function findAchievement(code: string | null | undefined): CertificateAchievement | undefined {
  return CERTIFICATE_ACHIEVEMENTS.find((a) => a.code === code);
}

export function achievementLabel(code: string | null | undefined): string | null {
  return findAchievement(code)?.label ?? null;
}
