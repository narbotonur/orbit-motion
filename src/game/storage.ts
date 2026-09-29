export type Run = {
  score: number;
  modules: number;
  corrections: number;
  seconds: number;
  finished: boolean;
  date: string;
};
const KEY = "orbit-motion:local-runs:v1";
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
