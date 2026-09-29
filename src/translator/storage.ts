import type { GestureTemplate } from "./model.ts";

const KEY = "orbit-motion:personal-gestures:v1";
const MAX_GESTURES = 12;

export function readVocabulary(): GestureTemplate[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is GestureTemplate =>
      !!item && typeof item === "object" &&
      typeof item.id === "string" && typeof item.label === "string" && item.label.length <= 40 &&
      (item.handCount === 1 || item.handCount === 2) &&
      Number.isFinite(item.threshold) && item.threshold >= 0.05 && item.threshold <= 0.4 &&
      Array.isArray(item.samples) && item.samples.length === 3 &&
      item.samples.every((sample: unknown) =>
        Array.isArray(sample) && sample.length === 12 && sample.every((frame: unknown) =>
          Array.isArray(frame) && frame.length === item.handCount * 66 &&
          frame.every((number: unknown) => typeof number === "number" && Number.isFinite(number)),
        ),
      ),
    ).slice(0, MAX_GESTURES);
  } catch {
    return [];
  }
}

export function saveVocabulary(templates: GestureTemplate[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(templates.slice(0, MAX_GESTURES)));
    return true;
  } catch {
    return false;
  }
}

export const vocabularyLimit = MAX_GESTURES;
