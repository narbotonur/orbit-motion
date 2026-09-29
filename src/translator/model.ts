import type { Point } from "../vision/gestures.ts";

export type FeatureFrame = {
  at: number;
  handCount: 1 | 2;
  vector: number[];
};
export type GestureTemplate = {
  id: string;
  label: string;
  handCount: 1 | 2;
  samples: number[][][];
  threshold: number;
  createdAt: string;
};
export type Match = {
  template: GestureTemplate;
  distance: number;
  accepted: boolean;
  ambiguous: boolean;
};
const pointDistance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Normalize each hand by palm size, but keep its screen position for motion and two-hand relations. */
export function extractFeatures(
  hands: Point[][],
  handedness: string[],
  at: number,
): FeatureFrame | null {
  if (hands.length < 1 || hands.length > 2 || hands.some((hand) => hand.length !== 21)) return null;
  const ordered = hands.map((hand, index) => ({ hand, side: handedness[index] ?? "Unknown" }))
    .sort((a, b) => {
      const rank = (side: string) => side === "Left" ? 0 : side === "Right" ? 1 : 2;
      return rank(a.side) - rank(b.side) || a.hand[0].x - b.hand[0].x;
    });
  const vector: number[] = [];
  for (const { hand } of ordered) {
    if (hand.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
    const xs = hand.map((p) => p.x), ys = hand.map((p) => p.y);
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    if (span < 0.12 || span > 0.88 || Math.min(...xs, ...ys) < 0.005 || Math.max(...xs, ...ys) > 0.995) return null;
    const wrist = hand[0];
    const palm = Math.max(pointDistance(wrist, hand[9]), 0.035);
    for (const point of hand) {
      vector.push(clamp((point.x - wrist.x) / (palm * 4), -1, 1));
      vector.push(clamp((point.y - wrist.y) / (palm * 4), -1, 1));
    }
    // Repeating global wrist coordinates makes movement matter alongside finger shape.
    for (let i = 0; i < 12; i++) vector.push(wrist.x, wrist.y);
  }
  return { at, handCount: ordered.length as 1 | 2, vector };
}

export function normalizeSequence(frames: FeatureFrame[], count = 12): number[][] | null {
  if (frames.length < 8 || frames.some((frame) => frame.handCount !== frames[0].handCount)) return null;
  return Array.from({ length: count }, (_, index) => {
    const position = index * (frames.length - 1) / (count - 1);
    const left = Math.floor(position);
    const right = Math.min(frames.length - 1, left + 1);
    const blend = position - left;
    return frames[left].vector.map((value, dimension) =>
      value * (1 - blend) + frames[right].vector[dimension] * blend,
    );
  });
}

function frameDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum / a.length);
}

/** Short temporal DTW tolerates slightly faster/slower execution without discarding direction. */
export function sequenceDistance(a: number[][], b: number[][]): number {
  if (!a.length || !b.length || a[0].length !== b[0].length) return Infinity;
  const costs = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(Infinity));
  const lengths = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));
  costs[0][0] = 0;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const previous = [[i - 1, j], [i, j - 1], [i - 1, j - 1]]
        .sort((x, y) => costs[x[0]][x[1]] - costs[y[0]][y[1]])[0];
      costs[i][j] = costs[previous[0]][previous[1]] + frameDistance(a[i - 1], b[j - 1]);
      lengths[i][j] = lengths[previous[0]][previous[1]] + 1;
    }
  }
  let motionPenalty = 0;
  let motionComponents = 0;
  // DTW aligns timing; endpoint displacement preserves the direction of a moving sign.
  for (let wrist = 42; wrist < a[0].length; wrist += 66) {
    for (const axis of [0, 1]) {
      const deltaA = a[a.length - 1][wrist + axis] - a[0][wrist + axis];
      const deltaB = b[b.length - 1][wrist + axis] - b[0][wrist + axis];
      motionPenalty += (deltaA - deltaB) ** 2;
      motionComponents++;
    }
  }
  return costs[a.length][b.length] / lengths[a.length][b.length] +
    0.7 * Math.sqrt(motionPenalty / motionComponents);
}

export function createTemplate(label: string, recordings: FeatureFrame[][]): GestureTemplate | null {
  if (recordings.length !== 3 || !label.trim()) return null;
  const handCount = recordings[0][0]?.handCount;
  if (!handCount || recordings.some((frames) => frames.some((f) => f.handCount !== handCount))) return null;
  const samples = recordings.map((frames) => normalizeSequence(frames));
  if (samples.some((sample) => !sample)) return null;
  const safeSamples = samples as number[][][];
  const distances = [
    sequenceDistance(safeSamples[0], safeSamples[1]),
    sequenceDistance(safeSamples[0], safeSamples[2]),
    sequenceDistance(safeSamples[1], safeSamples[2]),
  ];
  const threshold = clamp(Math.max(...distances) * 1.5, 0.12, 0.32);
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    label: label.trim().slice(0, 40),
    handCount,
    samples: safeSamples,
    threshold,
    createdAt: new Date().toISOString(),
  };
}

export function matchGesture(sequence: number[][], handCount: 1 | 2, templates: GestureTemplate[]): Match | null {
  const candidates = templates.filter((item) => item.handCount === handCount)
    .map((template) => ({
      template,
      distance: Math.min(...template.samples.map((sample) => sequenceDistance(sequence, sample))),
    }))
    .sort((a, b) => a.distance - b.distance);
  if (!candidates.length) return null;
  const best = candidates[0];
  const runnerUp = candidates[1];
  const ambiguous = !!runnerUp && runnerUp.distance < best.distance * 1.15 + 0.015;
  return { ...best, accepted: best.distance <= best.template.threshold && !ambiguous, ambiguous };
}

export function correctionForMatch(match: Match | null, frames: FeatureFrame[], templates: GestureTemplate[]): string {
  if (!frames.length) return "Покажи жест целиком в кадре — камера должна видеть пальцы.";
  const count = frames[frames.length - 1].handCount;
  if (!match) {
    if (count === 1 && templates.some((item) => item.handCount === 2)) return "Для этого жеста покажи обе руки целиком.";
    return "Для такого числа рук пока нет записанного жеста. Добавь его в словарь.";
  }
  if (match.ambiguous) return "Жест похож сразу на два слова. Сделай движение более отчётливо или перезапиши похожие жесты.";
  const reference = match.template.samples[0];
  const first = frames[0].vector, last = frames[frames.length - 1].vector;
  const actualDx = last[42] - first[42];
  const expectedDx = reference[reference.length - 1][42] - reference[0][42];
  const actualDy = last[43] - first[43];
  const expectedDy = reference[reference.length - 1][43] - reference[0][43];
  if (Math.abs(expectedDx) > 0.1 && Math.abs(actualDx) < Math.abs(expectedDx) * 0.55)
    return `Для «${match.template.label}» проведи рукой ${expectedDx > 0 ? "правее" : "левее"}.`;
  if (Math.abs(expectedDy) > 0.1 && Math.abs(actualDy) < Math.abs(expectedDy) * 0.55)
    return `Для «${match.template.label}» двигай рукой ${expectedDy > 0 ? "ниже" : "выше"}.`;
  return `Жест пока не совпадает с «${match.template.label}». Повтори форму пальцев и путь рук, как при записи.`;
}
