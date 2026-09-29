import { test } from "node:test";
import assert from "node:assert/strict";
import { GestureTracker } from "../src/vision/gestures.ts";
import { openHand, movedHand } from "./fixtures.ts";

test("recognizes an open hand without a canned gesture classifier", () => {
  const hand = new GestureTracker().observe(openHand, 100);
  assert.equal(hand.quality, "ok");
  assert.equal(hand.fingers, 4);
  assert.equal(hand.open, true);
  assert.equal(hand.pinch, false);
});
test("pinch hysteresis prevents repeated grabs from landmark jitter", () => {
  const tracker = new GestureTracker();
  const withRatio = (ratio: number) => {
    const p = structuredClone(openHand);
    p[4] = { x: p[8].x + 0.23 * ratio, y: p[8].y };
    return p;
  };
  assert.equal(tracker.observe(withRatio(0.28), 100).pinch, true);
  assert.equal(tracker.observe(withRatio(0.4), 150).pinch, true);
  assert.equal(tracker.observe(withRatio(0.5), 200).pinch, false);
  assert.equal(tracker.observe(withRatio(0.4), 250).pinch, false);
});
test("right swipe uses mirrored coordinates and emits one event with cooldown", () => {
  const tracker = new GestureTracker();
  tracker.observe(movedHand(0.65), 100);
  const swipe = tracker.observe(movedHand(0.4), 350);
  assert.equal(swipe.open, true);
  assert.equal(swipe.swipeRight, true);
  assert.equal(tracker.observe(movedHand(0.37), 400).swipeRight, false);
});
test("slow drift, reverse and diagonal movement do not count as right swipe", () => {
  for (const [x, y, at] of [
    [0.4, 0.5, 1500],
    [0.8, 0.5, 350],
    [0.4, 0.75, 350],
  ]) {
    const tracker = new GestureTracker();
    tracker.observe(movedHand(0.65), 100);
    assert.equal(tracker.observe(movedHand(x, y), at).swipeRight, false);
  }
});
test("missing, too small and out-of-frame hands have distinct quality states", () => {
  const tracker = new GestureTracker();
  assert.equal(tracker.observe([], 100).quality, "missing");
  assert.equal(tracker.observe(movedHand(0.5, 0.5, 0.1), 200).quality, "small");
  assert.equal(tracker.observe(movedHand(0.98), 300).quality, "edge");
});
test("loss of tracking cannot retain a pinch", () => {
  const tracker = new GestureTracker();
  const p = structuredClone(openHand);
  p[4] = { ...p[8] };
  assert.equal(tracker.observe(p, 100).pinch, true);
  assert.equal(tracker.observe([], 150).pinch, false);
  assert.equal(tracker.observe(openHand, 200).pinch, false);
});
