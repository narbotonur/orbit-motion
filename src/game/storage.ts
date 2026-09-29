export type Run = {
  score: number;
  modules: number;
  startLevel: number;
  corrections: number;
  seconds: number;
  finished: boolean;
  date: string;
};
const KEY = "orbit-motion:local-runs:v2";
const UNLOCK_KEY = "orbit-motion:unlocked-level:v1";
export function readUnlocked(): number {
  try {
    const value = Number(localStorage.getItem(UNLOCK_KEY));
    return Number.isInteger(value) && value >= 0 && value <= 9 ? value : 0;
  } catch {
    return 0;
  }
}
export function unlockLevel(level: number): boolean {
  try {
    localStorage.setItem(UNLOCK_KEY, String(Math.max(readUnlocked(), Math.min(9, level))));
    return true;
  } catch {
    return false;
  }
}
export function readRuns(): Run[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value)
      ? value
          .filter(
            (r): r is Run =>
              r &&
              typeof r === "object" &&
              Number.isFinite(r.score) &&
              Number.isFinite(r.modules) &&
              Number.isFinite(r.startLevel) &&
              typeof r.date === "string",
          )
          .slice(0, 8)
      : [];
  } catch {
    return [];
  }
}
export function saveRun(run: Run): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify([run, ...readRuns()].slice(0, 8)));
    return true;
  } catch {
    return false;
  }
}
