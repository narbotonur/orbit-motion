import { emptyObservation } from "../src/vision/gestures.ts";
import type { Observation, Point } from "../src/vision/gestures.ts";
export const openHand: Point[] = [
  [0.5, 0.8],
  [0.42, 0.72],
  [0.37, 0.64],
  [0.3, 0.58],
  [0.24, 0.53],
  [0.4, 0.6],
  [0.38, 0.45],
  [0.37, 0.35],
  [0.36, 0.26],
  [0.5, 0.57],
  [0.5, 0.4],
  [0.5, 0.29],
  [0.5, 0.2],
  [0.59, 0.6],
  [0.62, 0.45],
  [0.63, 0.35],
  [0.64, 0.27],
  [0.68, 0.65],
  [0.73, 0.54],
  [0.75, 0.47],
  [0.77, 0.4],
].map(([x, y]) => ({ x, y, z: 0 }));
export const observation = (patch: Partial<Observation> = {}): Observation => ({
  ...emptyObservation(1000),
  quality: "ok",
  open: true,
  fingers: 4,
  pinchRatio: 1.2,
  points: openHand,
  ...patch,
});
export function movedHand(
  centerX: number,
  centerY = 0.5,
  scale = 0.5,
): Point[] {
  return openHand.map((p) => ({
    x: centerX + (p.x - 0.5) * scale,
    y: centerY + (p.y - 0.5) * scale,
    z: 0,
  }));
}
