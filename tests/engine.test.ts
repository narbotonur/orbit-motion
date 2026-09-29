import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newGame,
  stepGame,
  SOURCE,
  DOCK,
  REPLAY,
  SECTORS,
  currentSector,
  swipeLane,
  gradeGame,
} from "../src/game/engine.ts";
import type { Game } from "../src/game/engine.ts";
import type { Observation } from "../src/vision/gestures.ts";
import { observation } from "./fixtures.ts";

function hold(s: Game, o: Observation, ticks = 16) {
  for (let i = 0; i < ticks; i++) s = stepGame(s, o, 100);
  return s;
}
function cycle(s: Game) {
  const sector = currentSector(s);
  s = stepGame(s, observation({ pointer: sector.source, pinch: false }), 100);
  s = stepGame(
    s,
    observation({ pointer: sector.source, pinch: true, open: false }),
    100,
  );
  assert.equal(s.carrying, true);
  s = stepGame(
    s,
    observation({ pointer: sector.dock, pinch: true, open: false }),
    100,
  );
  s = stepGame(s, observation({ pointer: sector.dock, pinch: false }), 100);
  assert.equal(s.task, "charge");
  s = hold(
    s,
    observation({ pointer: sector.dock }),
    Math.ceil(sector.chargeMs / 100) + 1,
  );
  assert.equal(s.task, "clear");
  for (let i = 0; i < sector.swipes; i++) {
    s = stepGame(
      s,
      observation({ pointer: { x: 0.75, y: swipeLane(s) }, swipeRight: true }),
      100,
    );
  }
  return s;
}
test("entire hands-free flow: calibration, practice, mission, result, replay", () => {
  let s = hold(newGame(), observation(), 10);
  assert.equal(s.phase, "tutorial");
  s = cycle(s);
  assert.equal(s.phase, "ready");
  assert.equal(s.score, 0);
  s = stepGame(s, observation({ open: false }), 100);
  s = hold(s, observation());
  assert.equal(s.phase, "playing");
  s = cycle(s);
  assert.equal(s.phase, "interlude");
  const frozenAtInterlude = s.remaining;
  s = hold(s, observation(), 18);
  assert.equal(s.remaining, frozenAtInterlude);
  assert.equal(s.phase, "playing");
  s = cycle(s);
  assert.equal(s.phase, "interlude");
  s = hold(s, observation(), 18);
  s = cycle(s);
  assert.equal(s.phase, "result");
  assert.equal(s.module, 3);
  assert.equal(s.finished, true);
  assert.ok(s.score >= 1050);
  assert.equal(s.bestCombo, 10);
  assert.equal(gradeGame(s), "S");
  const frozen = s.remaining;
  s = hold(s, observation());
  assert.equal(s.remaining, frozen);
  s = stepGame(s, observation({ open: false }), 100);
  s = hold(s, observation({ pointer: REPLAY }));
  assert.equal(s.phase, "ready");
});

test("second sector moves the cell and port, rejecting the old position", () => {
  let s: Game = {
    ...newGame(),
    phase: "playing",
    module: 1,
    cell: { ...SECTORS[1].source },
  };
  s = stepGame(
    s,
    observation({ pointer: SOURCE, pinch: true, open: false }),
    100,
  );
  assert.equal(s.carrying, false);
  s = stepGame(
    s,
    observation({ pointer: SECTORS[1].source, pinch: false }),
    100,
  );
  s = stepGame(
    s,
    observation({ pointer: SECTORS[1].source, pinch: true, open: false }),
    100,
  );
  assert.equal(s.carrying, true);
});

test("swiping outside the marked lane explains where to retry and breaks combo", () => {
  let s: Game = {
    ...newGame(),
    phase: "playing",
    module: 1,
    task: "clear",
    combo: 4,
  };
  s = stepGame(
    s,
    observation({ pointer: { x: 0.75, y: 0.75 }, swipeRight: true }),
    100,
  );
  assert.equal(s.task, "clear");
  assert.equal(s.module, 1);
  assert.equal(s.combo, 0);
  assert.match(s.hint, /верхнюю/);
  assert.equal(s.correction, true);
  assert.equal(s.correctionCount, 1);
});

test("life support requires two sweeps in two different lanes", () => {
  let s: Game = {
    ...newGame(),
    phase: "playing",
    module: 2,
    task: "clear",
    swipesLeft: 2,
  };
  s = stepGame(
    s,
    observation({ pointer: { x: 0.75, y: 0.69 }, swipeRight: true }),
    100,
  );
  assert.equal(s.phase, "playing");
  assert.equal(s.swipesLeft, 1);
  assert.equal(s.module, 2);
  s = stepGame(
    s,
    observation({ pointer: { x: 0.75, y: 0.31 }, swipeRight: true }),
    100,
  );
  assert.equal(s.phase, "result");
  assert.equal(s.finished, true);
});
test("pinching before reaching the cell cannot remotely grab it", () => {
  let s = { ...newGame(), phase: "playing" as const };
  s = stepGame(s, observation({ pinch: true, open: false }), 100) as typeof s;
  s = stepGame(
    s,
    observation({ pinch: true, open: false, pointer: SOURCE }),
    100,
  ) as typeof s;
  assert.equal(s.carrying, false);
  assert.match(s.hint, /Разожми/);
});
test("dropping outside dock resets cell and explains the mistake", () => {
  let s: Game = { ...newGame(), phase: "playing" };
  s = stepGame(
    s,
    observation({ pointer: SOURCE, pinch: true, open: false }),
    100,
  );
  s = stepGame(
    s,
    observation({ pointer: { x: 0.4, y: 0.4 }, pinch: false }),
    100,
  );
  assert.deepEqual(s.cell, SOURCE);
  assert.equal(s.task, "carry");
  assert.match(s.hint, /рано/);
  assert.equal(s.correctionCount, 1);
  s = hold(s, observation(), 10);
  assert.match(s.hint, /рано/);
  assert.equal(s.correction, true);
  s = stepGame(
    s,
    observation({ pointer: SOURCE, pinch: true, open: false }),
    100,
  );
  assert.equal(s.carrying, true);
  assert.equal(s.hintHold, 0);
  assert.equal(s.correction, false);
});
test("hand loss pauses time and cannot deposit a carried cell", () => {
  let s: Game = { ...newGame(), phase: "playing", carrying: true, cell: DOCK };
  s = stepGame(s, observation({ quality: "missing", pointer: DOCK }), 100);
  assert.equal(s.remaining, 90000);
  assert.equal(s.task, "carry");
  assert.equal(s.carrying, false);
  assert.deepEqual(s.cell, SOURCE);
  assert.equal(s.paused, true);
});
test("charging requires both open fingers and cursor inside dock", () => {
  let s: Game = { ...newGame(), phase: "playing", task: "charge" };
  s = hold(s, observation({ pointer: DOCK, open: false, fingers: 2 }));
  assert.equal(s.hold, 0);
  assert.match(s.hint, /2 из 4/);
  s = hold(s, observation({ pointer: SOURCE }));
  assert.equal(s.hold, 0);
  assert.match(s.hint, /кольцо/);
});
test("wrong swipe direction and vertical travel give different corrective hints", () => {
  const s: Game = { ...newGame(), phase: "playing", task: "clear" };
  assert.match(
    stepGame(s, observation({ swipeDx: -0.2 }), 100).hint,
    /другую сторону/,
  );
  assert.match(
    stepGame(s, observation({ swipeDy: 0.2 }), 100).hint,
    /горизонтально/,
  );
  assert.match(stepGame(s, observation({ swipeDx: 0.1 }), 100).hint, /дальше/);
});
test("timeout ends mission without awarding completion bonus", () => {
  const s = stepGame(
    { ...newGame(), phase: "playing", remaining: 50, score: 100 },
    observation(),
    100,
  );
  assert.equal(s.phase, "result");
  assert.equal(s.finished, false);
  assert.equal(s.score, 100);
  assert.equal(gradeGame(s), "C");
});
