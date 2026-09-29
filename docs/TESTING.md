# Human webcam acceptance checklist

Status: the team reported that the previous version worked on a physical webcam. **The new two-hand signal task and full ten-level campaign still need a manual webcam run.** Automated fake-camera and synthetic-observation tests are a separate check, not a substitute.

Record device, OS, browser, date and outcome here after testing. Use the production URL over HTTPS and good lighting.

- [ ] Open in a private window: landing accessible without Vercel login.
- [ ] Allow camera: visible mirrored feed, skeleton on either hand, no startup error.
- [ ] Hold an open palm centrally: calibration completes.
- [ ] Pinch over the energy cell, carry to port, release: charge step starts.
- [ ] Release too early: cell returns and a specific hint stays visible.
- [ ] Charge with two fingers folded: “N из 4” correction; straighten to complete.
- [ ] Swipe left, then diagonally: appropriate corrections. Swipe right to succeed.
- [ ] In the first live repair, show both hands apart: two skeletons appear and the left-hand frequency marker follows vertical movement.
- [ ] Tune too low and too high: the game separately asks to raise or lower the left hand. Hold it in the green band.
- [ ] With the right hand pinch the loose wire end, move it to the socket and keep both grip and frequency steady until the contact locks.
- [ ] Release the wire before it locks: it returns to the source with a specific hint. Repeat, then open both palms to transmit.
- [ ] Hide the left hand during the signal task: timer pauses and the cable cannot attach accidentally.
- [ ] Complete practice, start by open-palm dwell, repair the first three levels.
- [ ] Communications → navigation → life support: targets change position and level transitions appear without input.
- [ ] Sweep outside a marked lane: the game explains whether to aim higher or lower. In life support, clear both lower and upper lanes.
- [ ] Level 4: drop a cell into the amber false port, see the specific correction, then use the green port.
- [ ] Levels 5–10: complete every repair node; check ordered lanes, level timers and that unlocked levels remain available after a reload.
- [ ] Let a later-level timer expire: retry should restart that same level, not the whole campaign.
- [ ] Complete a clean run and observe increasing combo, rank and local record.
- [ ] Hide the hand and switch tabs: timer pauses; no accidental cell placement.
- [ ] See result and local record; gesture replay works without mouse.
- [ ] Exit: camera indicator switches off. Re-enter: camera initializes again.
- [ ] Deny camera in a private window: recovery instructions and retry appear.
- [ ] Phone, if available: front camera, portrait layout, calibration and one full cycle.

## Presentation rehearsal (2 minutes)

1. Say: “We restore a station with a webcam: grab, charge, swipe, then tune and reconnect a signal with both hands.”
2. Show live skeleton and each action during practice.
3. Deliberately release early and bend fingers to demonstrate concrete correction.
4. Start the mission; complete two levels, show a wrong-lane correction and the level map. If time allows, show a genuine recorded final-level run as the full-campaign proof.
5. Explain: MediaPipe gives points; our rules, time windows and state machine decide actions and corrections. No video leaves the browser.

Do not claim the recognition model was trained by the team. If live lighting is unreliable, show a genuine prerecorded run as backup, explicitly labelled as a recording—not as live inference.

## ORBIT TRANSLATOR manual checklist

This second mode is experimental; the following checks are still pending on a real two-hand webcam session:

- [ ] Open `/?mode=translator` on the production domain; game link and return link both work.
- [ ] Allow camera access. Both hands have separate, aligned skeleton overlays. Check a laptop and a front-facing phone camera.
- [ ] Record three consistent repetitions of one two-hand moving gesture; the new label appears in the personal dictionary.
- [ ] Show the same gesture again. It produces one word, not repeated words while hands remain in place.
- [ ] Lower hands, show it again, and confirm a second word appears. Undo, clear and speech work.
- [ ] Try a reversed or incomplete movement: it must not silently become a word; check the correction.
- [ ] Reload the page: the label remains, but video was not stored. Delete the label and reload again.
- [ ] Test with another person: record their own template; do not claim signer-independent recognition without evaluation.
