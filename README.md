# Pool Shot Log

An experimental, free, installable web app (PWA) for logging pool practice on an Android phone.

For each shot you mark, on a to-scale 9 ft table:

- where the cue ball and object ball started, and which pocket you aimed at
- where you wanted the cue ball to finish (optional target) and where it actually stopped
- where the object ball crossed the pocket mouth, in a zoomed pocket view turned to your line of aim
- vertical spin (draw / stun / stun-run / centre ball / follow), side spin, speed, and whether the ball was made, rattled or missed

- pick a starter drill (stop shot, stun-run, draw, tangent line, follow, lag) or save your own ball setup as a drill; drills with no object ball work for position-only practice

- practice sessions (a new one starts after 2 hours without a shot, or on demand) and a session-by-session comparison in Stats
- target zones around the cue ball target (3 in or 6 in circle, half-diamond or diamond box) with an in-zone success rate

**Cut break mode** (the Shots / Cut break switch on the Log tab) logs real breaks: where you broke from (with the break box drawn), the target side pocket, 8-, 9- or 10-ball rack, tip, how much of the 1-ball you hit (a 1-ball picker under the cue ball: full, 3/4, 1/2, 1/4, left or right side) and speed, where the 1-ball reached the side rail (long or short of the pocket centre, in inches), where the cue ball stopped (an exact spot, or just Upper / Centre / Lower, split at the 3rd and 5th diamonds) or a scratch, and optionally how many balls went down. While you set up, the table shows a predicted 1-ball and cue ball path from the break spot, hit and speed. It comes from the prototype's physics engine with untuned textbook values, so treat it as a guide; each break saves the prediction next to what really happened so the two can be compared. In Cut break mode the table is pinned on a phone held upright (Unpin table turns it off), so the tip, 1-ball hit and speed sections sit right under it while you adjust.

The log sections (table markers, tip, speed, pocket entry and so on) have headings and can be reordered with Rearrange sections at the bottom of the Log tab. Shots and Cut break each keep their own order, saved on the device. Stats has its own Cut breaks page: 1-ball make rate, long/short miss pattern, scratch rate, where the cue ball ended up by section and on the table, and tables by break spot, speed and session.

It works in portrait and landscape (the table turns sideways with controls beside it). Pockets default to the Rasson Accura's 4.25 in corners and 4.75 in sides.

The app works out the cut angle, cue ball miss distance from target, pocket entry offset and aim error, shows stats by spin, and exports every shot as CSV.

## Use it

Once GitHub Pages is on, the app lives at **https://maddweeb.github.io/PP/**. Open it in Chrome on Android and choose *Add to Home screen* (or *Install app*). It works offline. Shots are stored on the phone, so export a CSV now and then as a backup.

## CSV coordinates

- `x` is inches from the left long cushion, `y` inches from the head cushion, to the ball centre, seen from the head end (100 × 50 in by default).
- Zones: column letter from the left, row number from the head rail (`A1` is the head-left corner). `8x4` cells are one diamond; `16x8` are half a diamond.
- `cut_angle_deg`: + is a cut to the right.
- `pocket_offset_in`: + means the object ball entered right of the pocket centre, seen from where it started. `aim_error_deg` is that offset as an angle from the object ball.
- `session_id` groups shots into practice sessions. `target_zone` is `point`, `c3`, `c6`, `half` or `dia`; `cb_in_zone` is 1 or 0 (blank for a point target).
- `record_type` is `shot` or `break`. For breaks, `cb_start_*` is the break spot, `target_pocket` the side pocket, `pocket_result` the 1-ball result, `ob1_rail_offset_in` where the 1-ball reached the side rail (+ long, toward the head rail; − short), `cb_scratch` 1 or 0, `cb_section` upper / centre / lower / scratch, `balls_made` the count if entered, `break_rack` 8, 9 or 10, `ob1_hit_offset_balls` the hit on the 1-ball in ball widths (0 full, ±0.5 half ball; + is the 1-ball's right side), `ob1_pred_rail_offset_in` the predicted rail offset (blank when the prediction missed that rail).
- `cb_error_in`: straight-line distance between the cue ball target and where it stopped (`dx`, `dy` give the direction).

## Develop

The whole app is one file, `src/app.html`. `python3 tools/build.py` wraps it with the manifest, icons and service worker into `dist/`. Pushing to `main` deploys `dist/` to GitHub Pages through `.github/workflows/pages.yml`.
