# ORBIT · Team OySan

Browser camera game for ADMIT HACKATHON, Motion qualifier, September 28–30, 2026 (Astana, UTC+5).

Restore an orbital station using three hand gestures: pinch to carry a power cell, open palm to charge, open-hand swipe to clear debris. A 90-second mission follows calibration and hands-free practice. No account required.

## Team

- **Narboto Nurlanov** — ideation, design work, presentation.
- **Aruzhan Nadir** — implementation, repository work, realization.

## Development provenance

This is a new repository with new game and gesture logic written during the hackathon. Earlier OySan work supplies only the Geist/Geist Mono font files (OFL licenses included), the emerald/neutral palette, and visual conventions such as cards, spacing and buttons. No earlier motion-recognition project or game code is imported. Development uses AI-assisted coding; commit authorship records the actual development account. We do not backdate commits.

## Run

Node.js 22.12+ (tested on Node 24), npm, and a webcam:

```sh
npm ci
npm run dev
```

Open `http://localhost:5180`. `npm ci` downloads a pinned Google Hand Landmarker model and copies MediaPipe WASM to `public/vision`. Production serves those files from the same origin. First installation requires internet; no external inference service is used. Camera permission needs HTTPS or localhost.

```sh
npm test
npm run build
npm run preview
```

## How to play

1. Click **Подключить камеру** and allow camera access. This browser permission is the only required mouse/touch step.
2. Show one open hand, fully inside the frame, facing the camera. Hold it near the centre for calibration.
3. Follow the three practice tasks without a timer:
   - **Pinch:** move the hand cursor onto the energy cell on the left, join thumb and index fingertips, carry it to the right-hand port, then release.
   - **Open palm:** straighten all four fingers and keep the cursor in the port until its ring fills.
   - **Swipe:** sweep an open hand from left to right **on the mirrored screen**.
4. Close/lower the hand once, then hold an open palm over the start target. Repair three modules in 90 seconds.
5. See score, modules repaired, active time and correction prompts. Close/lower the hand and dwell over **Ещё миссия** to replay.

Use a well-lit room, one hand, and a stable camera around face height. Either hand can control the cursor. You can play seated. On phones, use the front camera and prop the device up; do not hold it in the controlling hand. Mouse controls for sound, fullscreen and exit are optional. Exit stops the camera.

The camera preview is mirrored, so the cursor follows the direction you see. The central 76% of camera coordinates maps to the whole playfield, allowing edge targets without leaving the frame.

## The required error mode

This is implemented in the game, not a separate demo or a generic recognition failure message:

| Situation                                      | Feedback / response                                                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Fingers almost pinched over the cell           | Bring thumb and index fingertips together                                                                                |
| Pinch started away from the cell               | Release and pinch again over the cell                                                                                    |
| Cell released before reaching the port         | “Разжал слишком рано. Донеси ячейку до кольца справа.” Cell returns to its origin; hint remains readable for 1.8 seconds |
| Bent fingers while charging                    | “Разогни пальцы: раскрыты N из 4.”                                                                                       |
| Open palm outside the charging port            | Move the open hand into the ring on the right                                                                            |
| Swipe in reverse                               | Move left to right on the screen                                                                                         |
| Diagonal swipe                                 | Move horizontally, not up or down                                                                                        |
| Short/slow swipe                               | Continue farther to the right in one sweep                                                                               |
| Hand too small, too large, clipped, or missing | Move closer, farther away, inward, or show the whole hand respectively                                                   |

Amber feedback highlights corrections; the camera skeleton, gesture label, cursor, progress ring and task state show what the system sees. Tracking loss pauses the mission timer and returns any carried cell; it never falsely counts as a successful release. Background tabs also pause active play. Persistent corrections are counted in the result, but are not a biometric accuracy measure.

## Recognition and architecture

```text
Webcam → ImageBitmap → Web Worker / Hand Landmarker → 21 landmarks
       → our GestureTracker → deterministic game state machine → React UI
```

MediaPipe supplies landmarks only. **Our code** implements gesture classification, temporal smoothing, thresholds, state transitions, spatial targets, hold times, hysteresis, cooldown and contextual corrections. No prebuilt MediaPipe game or gesture demo is embedded.

- `src/vision/worker.ts`: CPU/WASM inference off the UI thread, one hand.
- `src/vision/camera.ts`: camera lifecycle, bounded frame pipeline (at most 20 FPS), failures and recovery.
- `src/vision/gestures.ts`: mirrored cursor smoothing; palm-normalized pinch thresholds 0.30 / 0.48; four-finger extension; swipe displacement > 0.23 over 100–700 ms, vertical travel < 0.15, 1-second cooldown.
- `src/game/engine.ts`: calibration → practice → ready → mission → result/replay. Charge 1.4 seconds; start/replay dwell 1.3 seconds.
- `src/game/storage.ts`: up to eight results in localStorage, graceful fallback if blocked.
- `src/ui/Board.tsx`: original SVG station, targets, progress and feedback.

Scoring: cell 100, charge 100, debris 150 points per module; successful completion adds 5 points per whole second remaining. Incomplete missions retain earned task points. The record is **local to this browser**, not a secure global leaderboard. Tracking-loss pauses prioritize accessibility over competitive time enforcement.

## Checks

```sh
npm test                       # 13 deterministic gesture/state tests
npm run build                  # TypeScript + production bundle
npx playwright install chromium
npm run test:e2e                # real WASM init + injected-observation UI flow
```

On Windows the browser tests use installed Google Chrome at its standard path; elsewhere they use Playwright Chromium. Update `playwright.config.ts` if your Chrome is installed elsewhere.

Automated browser checks initialize the real model using a fake camera, then inject synthetic observations **only in Vite development mode** to verify tutorial, mission, pause, result, storage and replay. They also test permission denial and a 390px viewport. The test input API is absent from production. These checks do **not** establish accuracy on a human hand; run the [manual webcam checklist](docs/TESTING.md) before the presentation.

Production WASM startup has also been checked in Chrome against `npm run preview`. Human webcam/device verification is recorded separately, not inferred from these tests.

## Privacy, limitations and deployment

- Frames and landmarks stay in the browser. No authentication, analytics, external inference API, video upload or recording.
- Assets are downloaded from the deployment; result summaries stay in localStorage. Use browser site-data controls to clear them.
- Requires a secure context (HTTPS, `localhost` or loopback), camera permission, WebAssembly and module workers. Start with current Chrome/Edge on a laptop. Mobile layout is provided; actual phone-camera compatibility still needs device testing.
- Low light, backlighting, occlusion, edge-on palms, rapid movement or an underpowered device can reduce detection quality. No medical or fitness claims.
- This is not an offline PWA. The first page/model load requires network access.
- Vercel settings are committed in `vercel.json`. Build: `npm run build`; output: `dist`; no secrets or backend configuration required. Dependency installation downloads the model, with checksum verification.

## Third-party assets and provenance

- [MediaPipe Tasks Vision](https://github.com/google-ai-edge/mediapipe) and its [Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js) supply landmark inference; version pinned in package-lock.json.
- The public Google float16 Hand Landmarker v1 bundle is fetched by `scripts/prepare-vision.mjs`; exact URL, byte length and SHA-256 are in `scripts/model-lock.json`.
- Geist and Geist Mono fonts: SIL Open Font License files in `licenses/`.
- Orbit mark, station drawing, layout implementation, game and rule-based gesture logic were created for this entry. Earlier OYSAN contribution is limited to the fonts/palette/design conventions disclosed above.

The competition submission description is in [docs/SUBMISSION.md](docs/SUBMISSION.md).
