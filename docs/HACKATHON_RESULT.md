# ADMIT Motion 2026 — result and next release

The submitted ORBIT build is preserved at Git tag `hackathon-2026-submission` (`7030b99`). That tag points to the September 29 contest build; post-hackathon improvements are separate. The tag is local until explicitly pushed to the remote repository.

The team's jury feedback reported **93/100**, just 1–2 points below the top 15:

| Criterion | Score |
| --- | ---: |
| Functionality | 29/30 |
| Error mode | 19/20 |
| Technical implementation | 19/20 |
| UX and design | 13/15 |
| Originality | 8/10 |
| Bonuses | 5/5 |

The jury singled out the contextual error mode: it notices partial pinches, early release, incomplete open palms, wrong-way swipes and hands leaving frame, then explains what to correct. They also valued distinct gestures, 10 levels and untimed practice. The clearest gaps were Russian-only UI and the experimental translator looking unfinished beside the complete game.

## Post-hackathon decisions

1. **The 10-level game is the main product and case study.** Its gesture rules, result screen and no-timer practice remain intact.
2. **Russian and English are supported in the game.** The browser language chooses the initial language; users can switch from the header. `?lang=ru` and `?lang=en` are shareable overrides.
3. **ORBIT TRANSLATOR is an ORBIT LABS experiment.** It is available at `/?mode=translator`, but no longer occupies a primary landing-page promotion. It is a locally trained personal vocabulary, not a sign-language translation product.
4. **The next proof point is a real lesson, not another gesture demo.** Test whether concrete movement corrections improve task completion in a short OYSAN exercise. Keyboard, mouse and touch must remain available. No accessibility or medical benefit is claimed without user studies.

Do not interpret the jury scores as a biometric accuracy or accessibility measurement. See [product vision](PRODUCT_VISION.md) for the validation plan and [translator limitations](TRANSLATOR.md) for that experiment's scope.
