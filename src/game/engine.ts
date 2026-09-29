import { trackingHint } from "../vision/gestures.ts";
import type { Observation, Point } from "../vision/gestures.ts";

export type Phase =
  "calibration" | "tutorial" | "ready" | "playing" | "interlude" | "result";
export type Task = "carry" | "charge" | "clear" | "signal";
type Wave = {
  source: Point;
  dock: Point;
  chargeMs: number;
  lanes: readonly number[];
  decoy?: Point;
};
type Sector = {
  name: string;
  goal: string;
  act: string;
  timeMs: number;
  waves: readonly Wave[];
};
export const SECTORS: readonly Sector[] = [
  {
    name: "Связь",
    goal: "Вернуть сигнал станции",
    act: "Пробуждение",
    timeMs: 75000,
    waves: [{ source: { x: 0.23, y: 0.59 }, dock: { x: 0.7, y: 0.46 }, chargeMs: 1200, lanes: [0.53] }],
  },
  {
    name: "Навигация",
    goal: "Открыть безопасный маршрут",
    act: "Пробуждение",
    timeMs: 80000,
    waves: [{ source: { x: 0.24, y: 0.35 }, dock: { x: 0.72, y: 0.61 }, chargeMs: 1500, lanes: [0.32] }],
  },
  {
    name: "Жизнеобеспечение",
    goal: "Защитить экипаж",
    act: "Пробуждение",
    timeMs: 85000,
    waves: [{ source: { x: 0.19, y: 0.66 }, dock: { x: 0.71, y: 0.34 }, chargeMs: 1800, lanes: [0.69, 0.31] }],
  },
  {
    name: "Солнечные панели",
    goal: "Развернуть питание станции",
    act: "Нестабильность",
    timeMs: 90000,
    waves: [{ source: { x: 0.22, y: 0.41 }, dock: { x: 0.75, y: 0.61 }, chargeMs: 1800, lanes: [0.31, 0.69], decoy: { x: 0.72, y: 0.32 } }],
  },
  {
    name: "Защитный контур",
    goal: "Закрыть два повреждённых узла",
    act: "Нестабильность",
    timeMs: 105000,
    waves: [
      { source: { x: 0.20, y: 0.34 }, dock: { x: 0.72, y: 0.39 }, chargeMs: 1600, lanes: [0.32] },
      { source: { x: 0.28, y: 0.69 }, dock: { x: 0.71, y: 0.65 }, chargeMs: 1800, lanes: [0.69] },
    ],
  },
  {
    name: "Тепловой баланс",
    goal: "Очистить три канала охлаждения",
    act: "Нестабильность",
    timeMs: 95000,
    waves: [{ source: { x: 0.20, y: 0.63 }, dock: { x: 0.70, y: 0.38 }, chargeMs: 2200, lanes: [0.69, 0.31, 0.53], decoy: { x: 0.72, y: 0.69 } }],
  },
  {
    name: "Ориентация",
    goal: "Выровнять станцию по двум осям",
    act: "Сближение",
    timeMs: 110000,
    waves: [
      { source: { x: 0.25, y: 0.39 }, dock: { x: 0.68, y: 0.65 }, chargeMs: 1700, lanes: [0.31, 0.69] },
      { source: { x: 0.18, y: 0.65 }, dock: { x: 0.75, y: 0.37 }, chargeMs: 1900, lanes: [0.53] },
    ],
  },
  {
    name: "Реактор",
    goal: "Перезапустить оба контура",
    act: "Сближение",
    timeMs: 120000,
    waves: [
      { source: { x: 0.22, y: 0.60 }, dock: { x: 0.69, y: 0.35 }, chargeMs: 2100, lanes: [0.69, 0.31], decoy: { x: 0.72, y: 0.68 } },
      { source: { x: 0.25, y: 0.34 }, dock: { x: 0.73, y: 0.65 }, chargeMs: 2200, lanes: [0.31, 0.69] },
    ],
  },
  {
    name: "Аварийный маяк",
    goal: "Пробить помехи и передать координаты",
    act: "Сближение",
    timeMs: 125000,
    waves: [
      { source: { x: 0.19, y: 0.34 }, dock: { x: 0.73, y: 0.62 }, chargeMs: 2000, lanes: [0.31, 0.53, 0.69] },
      { source: { x: 0.28, y: 0.68 }, dock: { x: 0.68, y: 0.36 }, chargeMs: 2200, lanes: [0.69, 0.31] },
    ],
  },
  {
    name: "Центральное ядро",
    goal: "Соединить все системы станции",
    act: "Финал",
    timeMs: 140000,
    waves: [
      { source: { x: 0.20, y: 0.63 }, dock: { x: 0.72, y: 0.35 }, chargeMs: 2200, lanes: [0.69, 0.31], decoy: { x: 0.71, y: 0.68 } },
      { source: { x: 0.25, y: 0.34 }, dock: { x: 0.72, y: 0.65 }, chargeMs: 2400, lanes: [0.31, 0.69] },
      { source: { x: 0.19, y: 0.56 }, dock: { x: 0.72, y: 0.44 }, chargeMs: 2600, lanes: [0.53, 0.31, 0.69], decoy: { x: 0.72, y: 0.72 } },
    ],
  },
];
export const SOURCE: Point = SECTORS[0].waves[0].source;
export const DOCK: Point = SECTORS[0].waves[0].dock;
export const REPLAY: Point = { x: 0.5, y: 0.77 };
export const near = (a: Point, b: Point, radius = 0.14) =>
  Math.hypot(a.x - b.x, a.y - b.y) < radius;
export type Game = {
  phase: Phase;
  task: Task;
  module: number;
  wave: number;
  startLevel: number;
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
  wireAttached: boolean;
};
export function currentSector(game: Game): Sector {
  return SECTORS[Math.min(game.module, SECTORS.length - 1)];
}
export function currentWave(game: Game): Wave {
  const sector = currentSector(game);
  return sector.waves[Math.min(game.wave, sector.waves.length - 1)];
}
export function swipeLane(game: Game): number {
  const wave = currentWave(game);
  return wave.lanes[wave.lanes.length - game.swipesLeft] ?? wave.lanes[0];
}
/** The target band varies by repair node; raising the left hand raises frequency. */
export function signalFrequency(game: Game): number {
  return [0.38, 0.62, 0.48, 0.72, 0.31][(game.module * 2 + game.wave) % 5];
}
/** Keep the hands apart: right hand picks up on the right and moves inward. */
export function signalCableEnd(game: Game): Point {
  return { x: 0.79, y: currentWave(game).source.y };
}
export function signalSocket(game: Game): Point {
  return { x: 0.52, y: currentWave(game).dock.y };
}
export const SIGNAL_TOLERANCE = 0.105;
export function gradeGame(game: Game): "S" | "A" | "B" | "C" {
  if (!game.finished) return "C";
  if (game.correctionCount === 0) return "S";
  if (game.correctionCount <= 3) return "A";
  return game.correctionCount <= 8 ? "B" : "C";
}
export function newGame(startLevel = 0): Game {
  const level = Math.max(0, Math.min(SECTORS.length - 1, Math.floor(startLevel)));
  return {
    phase: "calibration",
    task: "carry",
    module: level,
    wave: 0,
    startLevel: level,
    remaining: SECTORS[level].timeMs,
    score: 0,
    hold: 0,
    carrying: false,
    cell: { ...SECTORS[level].waves[0].source },
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
    wireAttached: false,
  };
}
export const taskNames = {
  carry: "Подключи энергоячейку",
  charge: "Заряди модуль",
  clear: "Убери помеху",
  signal: "Настрой сигнал и почини провод",
};
export const taskInstructions = {
  carry:
    "Наведи курсор на ячейку слева, соедини большой и указательный пальцы. Перенеси в порт справа и разожми.",
  charge:
    "Раскрой ладонь и удерживай курсор в порту справа, пока кольцо не заполнится.",
  clear: "Раскрой ладонь и проведи ею слева направо через отмеченную полосу.",
  signal: "Держи руки по разным сторонам кадра. ЛЕВОЙ подбери частоту. ПРАВОЙ захвати конец провода СПРАВА и тяни его к разъёму В ЦЕНТРЕ. Удержи контакт, затем раскрой обе ладони.",
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
        : completed === "clear"
          ? "Помеха устранена"
          : "Связь восстановлена";
  if (s.phase === "playing") award(s, completed === "signal" ? 200 : completed === "clear" ? 150 : 100);
  if (completed === "carry") s.task = "charge";
  else if (completed === "charge") {
    s.task = "clear";
    s.swipesLeft = s.phase === "tutorial" ? 1 : currentWave(s).lanes.length;
  } else if (completed === "clear" && s.phase === "playing") {
    s.task = "signal";
    s.cell = signalCableEnd(s);
    s.wireAttached = false;
    s.hint = "Левой рукой найди частоту. Правой захвати провод СПРАВА и тяни к центру.";
  } else if (s.phase === "tutorial") {
    s.phase = "ready";
    s.armed = false;
    s.task = "carry";
    s.cell = { ...currentWave(s).source };
    s.swipesLeft = 1;
  } else {
    if (s.wave + 1 < currentSector(s).waves.length) {
      s.wave++;
      s.task = "carry";
      s.wireAttached = false;
      s.swipesLeft = 1;
      s.cell = { ...currentWave(s).source };
      s.hint = `Узел ${s.wave} восстановлен. Найди следующую ячейку слева.`;
    } else {
      s.score += Math.floor(s.remaining / 1000) * 5;
      s.module++;
      if (s.module === SECTORS.length) {
        s.phase = "result";
        s.finished = true;
        s.armed = false;
      } else {
        s.phase = "interlude";
        s.interludeRemaining = 1800;
        s.wave = 0;
        s.task = "carry";
        s.wireAttached = false;
        s.swipesLeft = 1;
        s.remaining = currentSector(s).timeMs;
        s.cell = { ...currentWave(s).source };
        s.hint = `${SECTORS[s.module - 1].name} восстановлена. Дальше — ${currentSector(s).name.toLowerCase()}.`;
      }
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
      s.hint = `Уровень ${s.module + 1}: ${currentSector(s).goal.toLowerCase()}. Захвати ячейку слева.`;
      s.previousPinch = hand.pinch;
    }
    return s;
  }
  s.paused = hand.quality !== "ok" ||
    (s.phase === "playing" && s.task === "signal" && hand.partner?.quality !== "ok");
  if (s.paused) {
    s.hintHold = 0;
    cue(s, hand.quality !== "ok"
      ? trackingHint(hand.quality)
      : hand.partner && hand.partner.quality !== "missing"
        ? `Левая рука видна не полностью. ${trackingHint(hand.partner.quality)}`
        : "Покажи левую руку целиком: ею настраивается частота.", true);
    s.hold = 0;
    s.correctionTime = 0;
    // Losing the hand cannot be interpreted as releasing a carried cell.
    if (s.carrying) {
      s.carrying = false;
      s.cell = s.task === "signal" ? signalCableEnd(s) : { ...currentWave(s).source };
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
        return { ...newGame(s.finished ? 0 : s.module), phase: "ready", armed: false };
      Object.assign(s, newGame(s.startLevel), {
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
    const wave = currentWave(s);
    if (s.task === "carry") {
      if (s.carrying) {
        s.cell = { ...hand.pointer };
        cue(
          s,
          near(hand.pointer, wave.dock)
            ? "Разожми пальцы — ячейка в порту."
            : wave.decoy && near(hand.pointer, wave.decoy)
              ? "Это ложный порт. Нужен зелёный, а не янтарный круг."
              : "Держи пальцы вместе и перенеси ячейку в зелёный порт.",
        );
        if (!hand.pinch) {
          s.carrying = false;
          if (near(hand.pointer, wave.dock)) nextTask(s);
          else {
            s.cell = { ...wave.source };
            s.combo = 0;
            cue(
              s,
              wave.decoy && near(hand.pointer, wave.decoy)
                ? "Это ложный порт. Захвати ячейку снова и донеси до зелёного кольца."
                : "Разжал слишком рано. Донеси ячейку до зелёного кольца справа.",
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
        near(hand.pointer, wave.source, 0.16)
      ) {
        s.hintHold = 0;
        s.carrying = true;
        s.cell = { ...hand.pointer };
        cue(s, "Захват! Перенеси ячейку вправо, не разжимая пальцы.");
      } else if (!near(hand.pointer, wave.source, 0.16))
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
      const inDock = near(hand.pointer, wave.dock, 0.18);
      s.hold =
        hand.open && inDock ? s.hold + dt : Math.max(0, s.hold - dt * 0.5);
      if (!hand.open)
        cue(s, `Разогни пальцы: раскрыты ${hand.fingers} из 4.`, true);
      else if (!inDock)
        cue(s, "Перемести раскрытую ладонь в кольцо справа.", true);
      else cue(s, "Держи ладонь здесь. Модуль заряжается.");
      if (s.hold >= wave.chargeMs) nextTask(s);
    } else if (s.task === "signal") {
      const left = hand.partner!;
      const cableEnd = signalCableEnd(s);
      const socket = signalSocket(s);
      const frequency = 1 - left.pointer.y;
      const target = signalFrequency(s);
      const tuned = Math.abs(frequency - target) <= SIGNAL_TOLERANCE;
      const frequencyHint = frequency > target
        ? "Частота слишком высокая — опусти левую руку."
        : "Частота слишком низкая — подними левую руку.";
      if (s.wireAttached) {
        s.hold = tuned && left.open && hand.open ? s.hold + dt : 0;
        if (!tuned) cue(s, frequencyHint, true);
        else if (!left.open || !hand.open)
          cue(s, "Контакт есть. Раскрой обе ладони, чтобы передать сигнал.", true);
        else cue(s, "Сигнал передаётся. Удержи обе ладони открытыми.");
        if (s.hold >= 900) nextTask(s);
      } else if (s.carrying) {
        if (!hand.pinch) {
          s.carrying = false;
          s.cell = cableEnd;
          s.hold = 0;
          cue(s, "Отпустил провод до фиксации. Захвати конец снова и удержи его в разъёме.", true);
          s.hintHold = 1600;
          s.correctionCount++;
          s.lastCorrection = s.hint;
          s.correctionTime = 0;
          s.combo = 0;
        } else {
          s.cell = { ...hand.pointer };
          const atSocket = near(hand.pointer, socket, 0.13);
          s.hold = atSocket && tuned ? s.hold + dt : 0;
          if (!tuned) cue(s, frequencyHint, true);
          else if (!atSocket)
            cue(s, "Частота совпала. Правой рукой тяни провод справа к разъёму в центре.", true);
          else cue(s, "Контакт найден. Удержи щипок и частоту до фиксации.");
          if (s.hold >= 650) {
            s.wireAttached = true;
            s.carrying = false;
            s.cell = socket;
            s.hold = 0;
            s.event++;
            s.feedback = "Провод закреплён";
            cue(s, "Провод закреплён. Раскрой обе ладони для передачи.");
          }
        }
      } else if (hand.pinch && !s.previousPinch && near(hand.pointer, cableEnd, 0.16)) {
        s.carrying = true;
        s.cell = { ...hand.pointer };
        cue(s, tuned
          ? "Частота совпала. Правой рукой веди провод справа к центру."
          : frequencyHint, !tuned);
      } else if (!tuned) cue(s, frequencyHint, true);
      else if (!near(hand.pointer, cableEnd, 0.16))
        cue(s, "Частота совпала. Наведи правую руку на свободный конец провода СПРАВА.");
      else if (hand.pinch)
        cue(s, "Разожми правые пальцы и сделай новый щипок над концом провода.", true);
      else cue(s, "Сделай щипок правой рукой над свободным концом провода.");
    } else {
      const lane = swipeLane(s);
      if (hand.swipeRight && hand.open) {
        if (s.phase === "tutorial" || Math.abs(hand.pointer.y - lane) <= 0.16) {
          if (s.phase === "playing" && s.swipesLeft > 1) {
            award(s, 50);
            s.swipesLeft--;
            s.event++;
            const nextLane = swipeLane(s);
            s.hint = `Поток расчищен. Проведи ещё раз через ${nextLane < 0.43 ? "верхнюю" : nextLane > 0.6 ? "нижнюю" : "среднюю"} полосу.`;
            s.feedback = `Осталось потоков: ${s.swipesLeft}`;
          } else nextTask(s);
        } else {
          s.combo = 0;
          cue(
            s,
            `Взмахни через ${lane < 0.43 ? "верхнюю" : lane > 0.6 ? "нижнюю" : "среднюю"} отмеченную полосу.`,
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
          `Начни слева и проведи раскрытой ладонью через ${lane < 0.43 ? "верхнюю" : lane > 0.6 ? "нижнюю" : "среднюю"} полосу вправо.`,
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
