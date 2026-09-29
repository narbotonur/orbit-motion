import { trackingHint } from "../vision/gestures.ts";
import type { Observation, Point } from "../vision/gestures.ts";

export type Phase = "calibration" | "tutorial" | "ready" | "playing" | "result";
export type Task = "carry" | "charge" | "clear";
export const SOURCE: Point = { x: 0.23, y: 0.59 };
export const DOCK: Point = { x: 0.7, y: 0.46 };
export const REPLAY: Point = { x: 0.5, y: 0.77 };
export const near = (a: Point, b: Point, radius = 0.14) =>
  Math.hypot(a.x - b.x, a.y - b.y) < radius;
export type Game = {
  phase: Phase;
  task: Task;
  module: number;
  remaining: number;
  score: number;
  hold: number;
  carrying: boolean;
  cell: Point;
  previousPinch: boolean;
  armed: boolean;
  hint: string;
  correction: boolean;
  paused: boolean;
  feedback: string;
  correctionCount: number;
  correctionTime: number;
  lastCorrection: string;
  hintHold: number;
  successes: number;
  elapsed: number;
  finished: boolean;
  event: number;
};
export function newGame(): Game {
  return {
    phase: "calibration",
    task: "carry",
    module: 0,
    remaining: 90000,
    score: 0,
    hold: 0,
    carrying: false,
    cell: { ...SOURCE },
    previousPinch: false,
    armed: false,
    hint: "Покажи раскрытую ладонь в центре кадра.",
    correction: false,
    paused: false,
    feedback: "",
    correctionCount: 0,
    correctionTime: 0,
    lastCorrection: "",
    successes: 0,
    elapsed: 0,
    finished: false,
    event: 0,
    hintHold: 0,
  };
}
export const taskNames = {
  carry: "Подключи энергоячейку",
  charge: "Заряди модуль",
  clear: "Убери помеху",
};
export const taskInstructions = {
  carry:
    "Наведи курсор на ячейку слева, соедини большой и указательный пальцы. Перенеси в порт справа и разожми.",
  charge:
    "Раскрой ладонь и удерживай курсор в порту справа, пока кольцо не заполнится.",
  clear: "Раскрой ладонь и проведи ею слева направо одним уверенным движением.",
};
function cue(s: Game, text: string, error = false) {
  if (s.hintHold > 0) {
    s.correction = true;
    return;
  }
  s.hint = text;
  s.correction = error;
}
function nextTask(s: Game) {
  s.hold = 0;
  s.hintHold = 0;
  s.carrying = false;
  s.successes++;
  s.event++;
  s.feedback =
    s.task === "carry"
      ? "Ячейка подключена"
      : s.task === "charge"
        ? "Питание восстановлено"
        : "Помеха устранена";
  if (s.phase === "playing") s.score += s.task === "clear" ? 150 : 100;
  if (s.task === "carry") s.task = "charge";
  else if (s.task === "charge") s.task = "clear";
  else if (s.phase === "tutorial") {
    s.phase = "ready";
    s.armed = false;
    s.task = "carry";
    s.cell = { ...SOURCE };
  } else {
    s.module++;
    if (s.module === 3) {
      s.phase = "result";
      s.finished = true;
      s.armed = false;
      s.score += Math.floor(s.remaining / 1000) * 5;
    } else {
      s.task = "carry";
      s.cell = { ...SOURCE };
    }
  }
}

/** Deterministic state machine. Both UI and tests use this exact implementation. */
export function stepGame(previous: Game, hand: Observation, dt: number): Game {
  const s = { ...previous, cell: { ...previous.cell } };
  dt = Math.max(0, Math.min(dt, 120)); // no timer jumps after tab suspension
  s.hintHold = Math.max(0, s.hintHold - dt);
  s.correction = false;
  s.paused = hand.quality !== "ok";
  if (s.paused) {
    s.hintHold = 0;
    cue(s, trackingHint(hand.quality), true);
    s.hold = 0;
    s.correctionTime = 0;
    // A lost hand must never count as releasing a cell into the dock.
    if (s.carrying) {
      s.carrying = false;
      s.cell = { ...SOURCE };
    }
    s.previousPinch = false;
    if (s.phase === "ready" || s.phase === "result") s.armed = true;
    return s;
  }
  if (s.phase === "calibration") {
    const centered = near(hand.pointer, { x: 0.5, y: 0.5 }, 0.35);
    s.hold = hand.open && centered ? s.hold + dt : 0;
    cue(
      s,
      !centered
        ? "Сдвинь ладонь к центру кадра."
        : !hand.open
          ? `Разогни четыре пальца. Видно раскрытых: ${hand.fingers} из 4.`
          : "Отлично. Задержи ладонь на секунду.",
      !centered || !hand.open,
    );
    if (s.hold >= 900) {
      s.phase = "tutorial";
      s.hold = 0;
      s.event++;
    }
  } else if (s.phase === "ready" || s.phase === "result") {
    if (!hand.open) s.armed = true;
    const target = s.phase === "ready" ? { x: 0.5, y: 0.5 } : REPLAY;
    const duration = 1300;
    s.hold =
      s.armed && hand.open && near(hand.pointer, target, 0.25)
        ? s.hold + dt
        : 0;
    cue(
      s,
      !s.armed
        ? "Опусти или сожми руку, затем снова раскрой ладонь."
        : "Наведи раскрытую ладонь на кнопку и удерживай.",
    );
    if (s.hold >= duration) {
      if (s.phase === "result")
        return { ...newGame(), phase: "ready", armed: false };
      Object.assign(s, newGame(), {
        phase: "playing",
        event: s.event + 1,
        paused: false,
      });
    }
  } else {
    if (s.phase === "playing") {
      s.remaining = Math.max(0, s.remaining - dt);
      s.elapsed += dt;
      if (s.remaining === 0) {
        s.phase = "result";
        s.finished = false;
        s.armed = false;
        s.hold = 0;
        return s;
      }
    }
    if (s.task === "carry") {
      if (s.carrying) {
        s.cell = { ...hand.pointer };
        cue(
          s,
          near(hand.pointer, DOCK)
            ? "Разожми пальцы — ячейка в порту."
            : "Держи пальцы вместе и перенеси ячейку в порт.",
        );
        if (!hand.pinch) {
          s.carrying = false;
          if (near(hand.pointer, DOCK)) nextTask(s);
          else {
            s.cell = { ...SOURCE };
            cue(
              s,
              "Разжал слишком рано. Донеси ячейку до кольца справа.",
              true,
            );
            s.hintHold = 1800;
          }
        }
      } else if (
        hand.pinch &&
        !s.previousPinch &&
        near(hand.pointer, SOURCE, 0.16)
      ) {
        s.hintHold = 0;
        s.carrying = true;
        s.cell = { ...hand.pointer };
        cue(s, "Захват! Перенеси ячейку вправо, не разжимая пальцы.");
      } else if (!near(hand.pointer, SOURCE, 0.16))
        cue(s, "Наведи курсор на ячейку слева.", hand.pinch);
      else if (hand.pinch)
        cue(s, "Разожми пальцы и снова сделай щипок над ячейкой.", true);
      else
        cue(
          s,
          "Соедини кончики большого и указательного пальцев.",
          hand.pinchRatio < 0.9,
        );
    } else if (s.task === "charge") {
      const inDock = near(hand.pointer, DOCK, 0.18);
      s.hold =
        hand.open && inDock ? s.hold + dt : Math.max(0, s.hold - dt * 0.5);
      if (!hand.open)
        cue(s, `Разогни пальцы: раскрыты ${hand.fingers} из 4.`, true);
      else if (!inDock)
        cue(s, "Перемести раскрытую ладонь в кольцо справа.", true);
      else cue(s, "Держи ладонь здесь. Модуль заряжается.");
      if (s.hold >= 1400) nextTask(s);
    } else {
      if (hand.swipeRight && hand.open) nextTask(s);
      else if (!hand.open) cue(s, "Раскрой ладонь перед взмахом.", true);
      else if (hand.swipeDx < -0.08)
        cue(s, "В другую сторону: веди ладонь слева направо по экрану.", true);
      else if (Math.abs(hand.swipeDy) > 0.15)
        cue(s, "Веди ладонь горизонтально, не вверх или вниз.", true);
      else if (hand.swipeDx > 0.06)
        cue(s, "Продолжи движение дальше вправо, одним взмахом.", true);
      else cue(s, "Начни слева и проведи раскрытой ладонью вправо.");
    }
    if (s.phase === "playing") {
      s.correctionTime = s.correction ? s.correctionTime + dt : 0;
      if (s.correctionTime > 800 && s.lastCorrection !== s.hint) {
        s.correctionCount++;
        s.lastCorrection = s.hint;
        s.correctionTime = 0;
      }
      if (!s.correction) s.lastCorrection = "";
    }
  }
  s.previousPinch = hand.pinch;
  return s;
}
