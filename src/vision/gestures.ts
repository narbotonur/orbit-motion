export type Point = { x: number; y: number; z?: number };
export type Quality = "ok" | "missing" | "small" | "large" | "edge";
export type Observation = {
  at: number;
  points: Point[];
  pointer: Point;
  quality: Quality;
  pinch: boolean;
  open: boolean;
  pinchRatio: number;
  fingers: number;
  swipeRight: boolean;
  swipeDx: number;
  swipeDy: number;
  fps: number;
  /** The hand displayed on the left; the primary observation is on the right. */
  partner?: Observation;
};
export const emptyObservation = (at: number): Observation => ({
  at,
  points: [],
  pointer: { x: 0.5, y: 0.5 },
  quality: "missing",
  pinch: false,
  open: false,
  pinchRatio: 2,
  fingers: 0,
  swipeRight: false,
  swipeDx: 0,
  swipeDy: 0,
  fps: 0,
});
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (n: number) => Math.max(0, Math.min(1, n));

/** Rules authored for ORBIT. MediaPipe supplies points, never gesture labels. */
export class GestureTracker {
  private pinching = false;
  private pointer: Point | null = null;
  private history: { at: number; x: number; y: number }[] = [];
  private lastSwipe = -Infinity;
  private previousAt = 0;

  reset() {
    this.pinching = false;
    this.pointer = null;
    this.history = [];
    this.previousAt = 0;
  }

  observe(points: Point[], at: number): Observation {
    const result = emptyObservation(at);
    if (
      points.length !== 21 ||
      points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))
    ) {
      this.reset();
      return result;
    }
    const xs = points.map((p) => p.x),
      ys = points.map((p) => p.y);
    const span = Math.max(
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys),
    );
    const palm = distance(points[0], points[9]);
    result.quality =
      span < 0.13
        ? "small"
        : span > 0.86
          ? "large"
          : Math.min(...xs) < 0.008 ||
              Math.max(...xs) > 0.992 ||
              Math.min(...ys) < 0.008 ||
              Math.max(...ys) > 0.992
            ? "edge"
            : "ok";
    result.points = points;
    // Camera is mirrored on screen. Inner 76% maps to the whole playfield.
    const pointer = {
      x: clamp((1 - points[9].x - 0.12) / 0.76),
      y: clamp((points[9].y - 0.12) / 0.76),
    };
    const alpha = this.previousAt
      ? 1 - Math.exp(-Math.min(at - this.previousAt, 150) / 55)
      : 1;
    this.pointer = this.pointer
      ? {
          x: this.pointer.x + (pointer.x - this.pointer.x) * alpha,
          y: this.pointer.y + (pointer.y - this.pointer.y) * alpha,
        }
      : pointer;
    result.pointer = this.pointer;
    result.fps = this.previousAt
      ? Math.round(1000 / Math.max(1, at - this.previousAt))
      : 0;
    this.previousAt = at;
    result.pinchRatio = distance(points[4], points[8]) / Math.max(palm, 0.015);
    // Different engage / release thresholds avoid noisy repeated grabs.
    this.pinching =
      result.quality === "ok" &&
      result.pinchRatio < (this.pinching ? 0.48 : 0.3);
    result.pinch = this.pinching;
    result.fingers = [8, 12, 16, 20].filter((tip) => {
      const pip = points[tip - 2],
        base = points[tip - 3];
      return (
        distance(points[tip], points[0]) > distance(pip, points[0]) * 1.15 &&
        distance(points[tip], base) > distance(pip, base) * 1.35
      );
    }).length;
    result.open =
      result.quality === "ok" && !this.pinching && result.fingers === 4;
    if (result.open) {
      this.history.push({ at, x: pointer.x, y: pointer.y });
      this.history = this.history.filter((p) => at - p.at <= 700);
      const start = this.history[0];
      result.swipeDx = pointer.x - start.x;
      result.swipeDy = pointer.y - start.y;
      const elapsed = at - start.at;
      result.swipeRight =
        elapsed >= 100 &&
        elapsed <= 700 &&
        result.swipeDx > 0.23 &&
        Math.abs(result.swipeDy) < 0.15 &&
        at - this.lastSwipe > 1000;
      if (result.swipeRight) {
        this.lastSwipe = at;
        this.history = [];
      }
    } else this.history = [];
    return result;
  }
}

export function trackingHint(quality: Quality): string {
  switch (quality) {
    case "missing":
      return "Покажи одну руку камере целиком.";
    case "small":
      return "Поднеси руку ближе к камере.";
    case "large":
      return "Отодвинь руку: она слишком близко.";
    case "edge":
      return "Сдвинь руку к центру: пальцы выходят за кадр.";
    default:
      return "";
  }
}
