# Pool Shot Log

An experimental, free, installable web app (PWA) for logging pool practice on an Android phone.

For each shot you mark, on a to-scale 9 ft table:

- where the cue ball and object ball started, and which pocket you aimed at
- where you wanted the cue ball to finish (optional target) and where it actually stopped
- where the object ball crossed the pocket mouth, in a zoomed pocket view turned to your line of aim
- vertical spin (draw / stun / stun-run / follow), side spin, speed, and whether the ball was made, rattled or missed

- pick a starter drill (stop shot, stun-run, draw, tangent line, follow, lag) or save your own ball setup as a drill; drills with no object ball work for position-only practice

It works in portrait and landscape (the table turns sideways with controls beside it). Pockets default to the Rasson Accura's 4.25 in corners and 4.75 in sides.

The app works out the cut angle, cue ball miss distance from target, pocket entry offset and aim error, shows stats by spin, and exports every shot as CSV.

## Use it

Once GitHub Pages is on, the app lives at **https://maddweeb.github.io/PP/**. Open it in Chrome on Android and choose *Add to Home screen* (or *Install app*). It works offline. Shots are stored on the phone, so export a CSV now and then as a backup.

## CSV coordinates

- `x` is inches from the left long cushion, `y` inches from the head cushion, to the ball centre, seen from the head end (100 × 50 in by default).
- Zones: column letter from the left, row number from the head rail (`A1` is the head-left corner). `8x4` cells are one diamond; `16x8` are half a diamond.
- `cut_angle_deg`: + is a cut to the right.
- `pocket_offset_in`: + means the object ball entered right of the pocket centre, seen from where it started. `aim_error_deg` is that offset as an angle from the object ball.
- `cb_error_in`: straight-line distance between the cue ball target and where it stopped (`dx`, `dy` give the direction).

## Develop

The whole app is one file, `src/app.html`. `python3 tools/build.py` wraps it with the manifest, icons and service worker into `dist/`. Pushing to `main` deploys `dist/` to GitHub Pages through `.github/workflows/pages.yml`.
