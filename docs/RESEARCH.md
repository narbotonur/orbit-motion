# References for the expanded ORBIT mission

Reviewed on 29 September 2026. These are design references, not imported source code or assets.

| Project                                                                                                       | Useful pattern                                                           | Why we did not adopt the game wholesale                                                                                            |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| [Hand Tracking Pong](https://github.com/alyhxn/hand-tracking-pong) (MIT)                                      | Immediate response to hand motion, opponent, score and synthesized sound | One continuous hand control action would miss ORBIT's three-gesture requirement and specific correction flow.                      |
| [Fruit Ninja Webcam](https://github.com/ronyrajan-p/fruit-ninja-webcam) (MIT)                                 | Escalating challenge, combo, hazards and a clear run summary             | Fast slicing and bombs make webcam jitter costly; ORBIT uses deliberate actions and corrective hints.                              |
| [Pop Pop Popper](https://github.com/rayhantr/pop-pop-popper) (no license published in its README)             | Readable camera skeleton, pinch hysteresis, local effects and feedback   | We did not use its code or assets. ORBIT keeps its own rules and task structure.                                                   |
| [Live Gesture Image Puzzle](https://github.com/Sandhya175/LIVE-GESTURE-IMAGE-PUZZLE) (license not identified) | Distinct phases and a concrete win state after object manipulation       | Its leaderboard asks for keyboard input; ORBIT keeps the scenario hands-free after camera permission. No code or assets were used. |

## Decision

Keep the orbital-repair story and three existing gestures. The first prototype's three systems became the opening act of a ten-level campaign. Later levels add multiple repair nodes, ordered debris lanes, false ports, per-level timers, locally saved unlocks and a retry of the failed level. The chapter transitions, combo and completion grade remain, as does actionable feedback for inaccurate gestures. The reusable lesson primitives in `PRODUCT_VISION.md` remain the product reason behind the game.

The mission, artwork, gesture thresholds and state machine remain original to this repository. All expanded core logic was written after the hackathon start. References influenced only high-level design choices.
