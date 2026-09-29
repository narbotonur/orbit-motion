import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, stepGame, SOURCE, DOCK, REPLAY } from "../src/game/engine.ts";
import type { Game } from "../src/game/engine.ts";
import type { Observation } from "../src/vision/gestures.ts";
import { observation } from "./fixtures.ts";

function hold(s: Game, o: Observation, ticks = 16) {
  for (let i = 0; i < ticks; i++) s = stepGame(s, o, 100);
  return s;
}
function cycle(s: Game) {
  s = stepGame(s, observation({ pointer: SOURCE, pinch: false }), 100);
  s = stepGame(
    s,
    observation({ pointer: SOURCE, pinch: true, open: false }),
    100,
  );
  assert.equal(s.carrying, true);
  s = stepGame(
    s,
    observation({ pointer: DOCK, pinch: true, open: false }),
    100,
  );
  s = stepGame(s, observation({ pointer: DOCK, pinch: false }), 100);
  assert.equal(s.task, "charge");
  s = hold(s, observation({ pointer: DOCK }));
  assert.equal(s.task, "clear");
  return stepGame(s, observation({ swipeRight: true }), 100);
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
  s = cycle(s);
  s = cycle(s);
  assert.equal(s.phase, "result");
  assert.equal(s.module, 3);
  assert.equal(s.finished, true);
  assert.ok(s.score >= 1050);
  const frozen = s.remaining;
  s = hold(s, observation());
  assert.equal(s.remaining, frozen);
  s = stepGame(s, observation({ open: false }), 100);
  s = hold(s, observation({ pointer: REPLAY }));
  assert.equal(s.phase, "ready");
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
});
