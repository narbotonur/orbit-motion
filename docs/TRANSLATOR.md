# ORBIT TRANSLATOR — personal gesture-to-text prototype

Open `/?mode=translator` from the **ORBIT LABS** link in the game's footer. This is a separate experiment within the same browser app, not part of the main ten-level game. The language switch supports Russian and English in both modes.

## What works

1. Click **Подключить камеру**. The same locally hosted MediaPipe Hand Landmarker detects up to two hands. The skeleton is drawn on the mirrored camera preview.
2. Enter a word or short phrase. Click **Записать 3 повтора** and perform the same one- or two-hand motion during each 1.5-second recording window. Keep the required hands visible for all three repetitions.
3. The app stores normalized landmark sequences and the label in this browser's localStorage. It does **not** store or upload camera images or video. The current cap is 12 personal gestures. Individual gestures can be deleted.
4. Show a recorded gesture again. After three stable matches, its label is appended to the message. Briefly lower both hands (or change to a nonmatching pose) between words. Undo, clear and browser text-to-speech are available.
5. An uncertain or ambiguous match does not become a word. Contextual guidance covers missing/partial hands, a second hand required by a template, two similar labels, insufficient movement in the trained direction, and shape/path mismatch.

The custom recognizer is in `src/translator/model.ts`: it normalizes 21 landmarks per hand by palm scale, retains wrist paths, resamples each recording to 12 frames, uses temporal Dynamic Time Warping with a displacement penalty, calibrates an acceptance threshold from three repetitions, and rejects ambiguous nearest-neighbour results. MediaPipe supplies only hand points; it does not assign the personal word labels. This is a lightweight per-user prototype, **not** a pre-trained sign-language model.

## What this is not

There is no single universal sign language. The [World Federation of the Deaf's International Sign FAQ](https://wfdeaf.org/wp-content/uploads/2019/06/FAQ-on-IS-June-17-2019-FINAL-included-IS.pdf) describes International Sign as a contact practice, not a fixed universal vocabulary. ORBIT TRANSLATOR currently learns gestures chosen by its user; it must **not** be described as a validated translator for International Sign, Kazakh Sign Language, ASL, or any other natural sign language.

Linguistic signs can require face, head and body cues as well as both hands. [Research with Kazakh-Russian Sign Language](https://aclanthology.org/2020.lrec-1.745.pdf) demonstrates the importance of non-manual components. [MediaPipe Holistic Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/holistic_landmarker) can expose these landmarks, but it is not integrated here. A real translation system would need a specified language, consented and licensed data, signer-independent testing, and collaboration with Deaf signers and interpreters. The generated message is a concatenation of personal labels, not grammatical translation.

## How we verified it

- `npm test`: two-hand feature ordering, three-sample training, opposite-motion rejection, ambiguity rejection, and missing-second-hand feedback.
- `npm run test:e2e`: a browser initializes the real WASM model with a fake camera; development-only synthetic landmarks exercise recording, saving and live message output. Mobile layout and camera disconnect are checked. The test hook is absent from production.
- **Pending:** physical webcam testing of the two-hand mode with several people, different lighting and moving signs. Automated tests cannot establish sign-language accuracy.

The browser stores the personal dictionary only on the current origin. Clearing site data also removes it. No account or server sync is implemented.
