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

Implementation and judging instructions are expanded as the playable version is completed.
