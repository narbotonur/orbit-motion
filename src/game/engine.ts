import { trackingHint } from "../vision/gestures.ts";
import type { Observation, Point } from "../vision/gestures.ts";

export type Phase =
  "calibration" | "tutorial" | "ready" | "playing" | "interlude" | "result";
export type Task = "carry" | "charge" | "clear";
type Sector = {
  name: string;
  goal: string;
  source: Point;
  dock: Point;
  chargeMs: number;
  lane: number;
  swipes: number;
};
export const SECTORS: readonly Sector[] = [
  {
    name: "Связь",
    goal: "Вернуть сигнал станции",
    source: { x: 0.23, y: 0.59 },
    dock: { x: 0.7, y: 0.46 },
    chargeMs: 1400,
    lane: 0.53,
    swipes: 1,
  },
  {
    name: "Навигация",
    goal: "Открыть безопасный маршрут",
    source: { x: 0.24, y: 0.35 },
    dock: { x: 0.72, y: 0.61 },
    chargeMs: 1800,
    lane: 0.32,
    swipes: 1,
  },
  {
    name: "Жизнеобеспечение",
    goal: "Защитить экипаж",
    source: { x: 0.19, y: 0.66 },
    dock: { x: 0.71, y: 0.34 },
    chargeMs: 2100,
    lane: 0.69,
    swipes: 2,
  },
];
export const SOURCE: Point = SECTORS[0].source;
export const DOCK: Point = SECTORS[0].dock;
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
  combo: number;
  bestCombo: number;
  swipesLeft: number;
  interludeRemaining: number;
};
export function currentSector(game: Game): Sector {
  return SECTORS[Math.min(game.module, SECTORS.length - 1)];
}
export function swipeLane(game: Game): number {
  return game.module === 2 && game.swipesLeft === 1
    ? 0.31
    : currentSector(game).lane;
}
export function gradeGame(game: Game): "S" | "A" | "B" | "C" {
  if (!game.finished) return "C";
  if (game.correctionCount === 0 && game.remaining >= 45000) return "S";
  if (game.correctionCount <= 2 && game.remaining >= 20000) return "A";
  return game.correctionCount <= 5 ? "B" : "C";
}
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
    hintHold: 0,
    successes: 0,
    elapsed: 0,
    finished: false,
    event: 0,
    combo: 0,
    bestCombo: 0,
    swipesLeft: 1,
    interludeRemaining: 0,
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
  clear: "Раскрой ладонь и проведи ею слева направо через отмеченную полосу.",
};
function cue(s: Game, message: string, correction = false) {
  if (s.hintHold > 0) {
    s.correction = true;
    return;
  }
  s.hint = message;
  s.correction = correction;
}
function award(s: Game, base: number) {
  s.score += Math.round(base * (1 + Math.min(s.combo, 4) * 0.25));
  s.combo++;
  s.bestCombo = Math.max(s.bestCombo, s.combo);
}
function nextTask(s: Game) {
  const completed = s.task;
  s.hold = 0;
  s.hintHold = 0;
  s.carrying = false;
  s.successes++;
  s.event++;
  s.feedback =
    completed === "carry"
      ? "Ячейка подключена"
      : completed === "charge"
        ? "Питание восстановлено"
        : "Помеха устранена";
  if (s.phase === "playing") award(s, completed === "clear" ? 150 : 100);
  if (completed === "carry") s.task = "charge";
  else if (completed === "charge") {
    s.task = "clear";
    s.swipesLeft = s.phase === "tutorial" ? 1 : currentSector(s).swipes;
  } else if (s.phase === "tutorial") {
    s.phase = "ready";
    s.armed = false;
    s.task = "carry";
    s.cell = { ...SOURCE };
    s.swipesLeft = 1;
  } else {
    s.module++;
    if (s.module === SECTORS.length) {
      s.phase = "result";
      s.finished = true;
      s.armed = false;
      s.score += Math.floor(s.remaining / 1000) * 5;
    } else {
      s.phase = "interlude";
      s.interludeRemaining = 1800;
      s.task = "carry";
      s.swipesLeft = 1;
      s.cell = { ...currentSector(s).source };
      s.hint = `${SECTORS[s.module - 1].name} восстановлена. Дальше — ${currentSector(s).name.toLowerCase()}.`;
    }
  }
}

/** Pure deterministic state machine shared by the live UI and tests. */
export function stepGame(previous: Game, hand: Observation, dt: number): Game {
  const s = { ...previous, cell: { ...previous.cell } };
  dt = Math.max(0, Math.min(dt, 120));
  s.hintHold = Math.max(0, s.hintHold - dt);
  s.correction = false;
  if (s.phase === "interlude") {
    s.paused = false;
    s.interludeRemaining = Math.max(0, s.interludeRemaining - dt);
    if (s.interludeRemaining === 0) {
      s.phase = "playing";
      s.hint = `Модуль ${s.module + 1}: ${currentSector(s).goal.toLowerCase()}. Захвати ячейку слева.`;
      s.previousPinch = hand.pinch;
    }
    return s;
  }
  s.paused = hand.quality !== "ok";
  if (s.paused) {
    s.hintHold = 0;
    cue(s, trackingHint(hand.quality), true);
    s.hold = 0;
    s.correctionTime = 0;
    // Losing the hand cannot be interpreted as releasing a carried cell.
    if (s.carrying) {
      s.carrying = false;
      s.cell = { ...currentSector(s).source };
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
    if (s.hold >= 1300) {
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
    const sector = currentSector(s);
    if (s.task === "carry") {
      if (s.carrying) {
        s.cell = { ...hand.pointer };
        cue(
          s,
          near(hand.pointer, sector.dock)
            ? "Разожми пальцы — ячейка в порту."
            : "Держи пальцы вместе и перенеси ячейку в порт.",
        );
        if (!hand.pinch) {
          s.carrying = false;
          if (near(hand.pointer, sector.dock)) nextTask(s);
          else {
            s.cell = { ...sector.source };
            s.combo = 0;
            cue(
              s,
              "Разжал слишком рано. Донеси ячейку до кольца справа.",
              true,
            );
            s.hintHold = 1800;
            if (s.phase === "playing") {
              s.correctionCount++;
              s.lastCorrection = s.hint;
              s.correctionTime = 0;
            }
          }
        }
      } else if (
        hand.pinch &&
        !s.previousPinch &&
        near(hand.pointer, sector.source, 0.16)
      ) {
        s.hintHold = 0;
        s.carrying = true;
        s.cell = { ...hand.pointer };
        cue(s, "Захват! Перенеси ячейку вправо, не разжимая пальцы.");
      } else if (!near(hand.pointer, sector.source, 0.16))
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
      const inDock = near(hand.pointer, sector.dock, 0.18);
      s.hold =
        hand.open && inDock ? s.hold + dt : Math.max(0, s.hold - dt * 0.5);
      if (!hand.open)
        cue(s, `Разогни пальцы: раскрыты ${hand.fingers} из 4.`, true);
      else if (!inDock)
        cue(s, "Перемести раскрытую ладонь в кольцо справа.", true);
      else cue(s, "Держи ладонь здесь. Модуль заряжается.");
      if (s.hold >= sector.chargeMs) nextTask(s);
    } else {
      const lane = swipeLane(s);
      if (hand.swipeRight && hand.open) {
        if (s.phase === "tutorial" || Math.abs(hand.pointer.y - lane) <= 0.16) {
          if (s.phase === "playing" && s.swipesLeft > 1) {
            award(s, 50);
            s.swipesLeft--;
            s.event++;
            s.hint =
              "Нижняя помеха устранена. Проведи ещё раз через верхнюю полосу.";
            s.feedback = "Осталась верхняя помеха";
          } else nextTask(s);
        } else {
          s.combo = 0;
          cue(
            s,
            `Взмахни через ${lane < 0.5 ? "верхнюю" : "нижнюю"} отмеченную полосу.`,
            true,
          );
          s.hintHold = 1500;
          s.correctionCount++;
          s.lastCorrection = s.hint;
          s.correctionTime = 0;
        }
      } else if (!hand.open) cue(s, "Раскрой ладонь перед взмахом.", true);
      else if (hand.swipeDx < -0.08)
        cue(s, "В другую сторону: веди ладонь слева направо по экрану.", true);
      else if (Math.abs(hand.swipeDy) > 0.15)
        cue(s, "Веди ладонь горизонтально, не вверх или вниз.", true);
      else if (hand.swipeDx > 0.06)
        cue(s, "Продолжи движение дальше вправо, одним взмахом.", true);
      else
        cue(
          s,
          `Начни слева и проведи раскрытой ладонью через ${lane < 0.5 ? "верхнюю" : "нижнюю"} полосу вправо.`,
        );
    }
    if (s.phase === "playing") {
      s.correctionTime = s.correction ? s.correctionTime + dt : 0;
      if (s.correctionTime > 800 && s.lastCorrection !== s.hint) {
        s.correctionCount++;
        s.lastCorrection = s.hint;
        s.correctionTime = 0;
        s.combo = 0;
      }
      if (!s.correction) s.lastCorrection = "";
    }
  }
  s.previousPinch = hand.pinch;
  return s;
}
