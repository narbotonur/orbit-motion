import { test } from "node:test";
import assert from "node:assert/strict";
import { movedHand } from "./fixtures.ts";
import {
  correctionForMatch,
  createTemplate,
  extractFeatures,
  matchGesture,
  normalizeSequence,
  sequenceDistance,
} from "../src/translator/model.ts";
import type { FeatureFrame } from "../src/translator/model.ts";

function sequence(reverse = false, twoHands = true, offset = 0): FeatureFrame[] {
  return Array.from({ length: 16 }, (_, i) => {
    const progress = reverse ? 1 - i / 15 : i / 15;
    const left = movedHand(.28 + progress * .22 + offset, .52, .55);
    const right = movedHand(.72 - progress * .08 + offset, .5, .55);
    const feature = extractFeatures(
      twoHands ? [left, right] : [left],
      twoHands ? ["Left", "Right"] : ["Left"],
      i * 80,
    );
    assert.ok(feature);
    return feature;
  });
}

test("two hands yield stable features independent of detection array order", () => {
  const left = movedHand(.3), right = movedHand(.7);
  const first = extractFeatures([left, right], ["Left", "Right"], 100);
  const reversed = extractFeatures([right, left], ["Right", "Left"], 100);
  assert.ok(first && reversed);
  assert.deepEqual(first.vector, reversed.vector);
  assert.equal(first.handCount, 2);
  assert.equal(first.vector.length, 132);
  assert.equal(extractFeatures([left.slice(0, 20)], ["Left"], 100), null);
});

test("three recordings produce a personal two-hand template and reject opposite motion", () => {
  const template = createTemplate("Помощь", [sequence(), sequence(false, true, .01), sequence(false, true, -.01)]);
  assert.ok(template);
  assert.equal(template.handCount, 2);
  assert.equal(template.samples.length, 3);
  const same = normalizeSequence(sequence(false, true, .004));
  const opposite = normalizeSequence(sequence(true));
  assert.ok(same && opposite);
  assert.equal(matchGesture(same, 2, [template])?.accepted, true);
  assert.equal(matchGesture(opposite, 2, [template])?.accepted, false);
  assert.ok(sequenceDistance(same, template.samples[0]) < sequenceDistance(opposite, template.samples[0]));
  assert.match(correctionForMatch(null, sequence(false, false), [template]), /обе руки/);
});

test("ambiguous or incomplete gestures are not translated", () => {
  const recordings = [sequence(), sequence(false, true, .006), sequence(false, true, -.006)];
  const first = createTemplate("А", recordings);
  const second = createTemplate("Б", recordings);
  assert.ok(first && second);
  const sample = normalizeSequence(sequence());
  assert.ok(sample);
  const result = matchGesture(sample, 2, [first, second]);
  assert.ok(result);
  assert.equal(result.accepted, false);
  assert.equal(result.ambiguous, true);
  assert.equal(normalizeSequence(sequence().slice(0, 4)), null);
});
