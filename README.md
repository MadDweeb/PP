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

**Cut break mode** (the Shots / Cut break switch on the Log tab) logs real breaks: where you broke from (with the break box drawn), the target side pocket, 8-, 9- or 10-ball rack, tip, how much of the 1-ball you hit (a 1-ball picker under the cue ball: full, 3/4, 1/2, 1/4, left or right side) and speed, where the 1-ball reached the side rail (long or short of the pocket centre, in inches), where the cue ball stopped (an exact spot, or just Upper / Centre / Lower, split at the 3rd and 5th diamonds) or a scratch, and optionally how many balls went down. While you set up, the table shows a predicted 1-ball and cue ball path from the break spot, hit and speed. It comes from the prototype's physics engine with untuned textbook values, so treat it as a guide; each break saves the prediction next to what really happened so the two can be compared. On every Log mode the cue ball tip picker sits beside the table and the speed bar on the other side (tip on the left by default; Rearrange sections swaps them). Where there is a hit picker (Cut break, Simulator Shot and Break) it sits under the tip; a drag moves it half as far as your finger for fine control, a tap sets it directly. In Cut break mode the table is pinned on a phone held upright (Unpin table turns it off), so the tip and 1-ball hit sections sit right under it (with the speed bar beside it) while you adjust. The Simulator pins the table the same way.

**Simulator** (the third switch on the Log tab, next to Cut break) is the ball physics sandbox. Shot: place the cue ball, object ball and target, pick a pocket, then set the tip, the hit on the object ball ("Pot it" picks the hit that sends it at the pocket) and the speed. Break: break the 8-, 9- or 10-ball rack from anywhere behind the head string, and Run 50 for averages. The paths update live while you drag the tip, the hit, the speed or a ball; Shoot or Break plays it back in real time. Nothing in the Simulator is saved to your log. Rack tightness (in Tune to your table) models a frozen rack: a still ball backed by still balls behind it acts heavier when an object ball runs into it, which is what sends the 1-ball back off the second row toward a side pocket on a cut break. 0 turns it off. Its Tune to your table settings are shared with Cut break, so tuning in either place changes the Cut break prediction.

**Play** (the third Simulator switch, next to Shot and Break) is a game of 8-, 9- or 10-ball for two players on one phone, refereed by the WPA Rules of Play (2025): lowest ball first in 9- and 10-ball, called shots in 8- and 10-ball (the call fills in from your aim: the ball you will hit first and the pocket it is heading for; change it in the Game section or tap a pocket), open table and groups in 8-ball, ball in hand after a foul, three fouls in a row lose the rack in 9- and 10-ball, and the WPA options after a push out, an illegal 8-ball break, an 8 on the break or (10-ball) a ball made without the called shot. One house rule: a push out is allowed only on the shot after a foul-free break, and only when the cue ball has no straight line to any part of the lowest ball. Break from the break box (or anywhere behind the head string, a Game setting); paths are hidden on the break because each rack is racked a little differently. A status line above the table says whose turn it is (with the score once a rack is won). Aim by dragging the cue: it lies under your finger and the cue ball goes the other way (the further from the ball, the finer). A tap ahead of the cue ball aims straight at that spot, a tap behind it moves the cue there, and 0.1° buttons do the last bit. With ball in hand, press on or near the cue ball to move it; the aim stays on the ball it was on; the ghost ball (where the cue ball meets the first ball, or the first rail when it meets no ball) and paths follow the aim, the tip and the speed live. Paths: all balls, the cue ball only, just the ghost ball (with the cue ball's route to it), or none. A foul shows a red banner saying what it was (tap it to dismiss; it leaves Undo shot uncovered). Undo shot steps back one shot at a time, as far as the start of the rack; pressed while the balls are still rolling, it stops the shot and puts them back. The rack chips above the table pick the game. The game is kept on the phone, so it survives closing the app. Each player has their own cue, drawn on the table behind the cue ball and as a full cue standing beside the table under the tip; tap it to pick the shaft (maple, low-deflection maple, ash, carbon fibre, fibreglass), the butt (birdseye maple, cocobolo, ebony, rosewood, bocote, purpleheart, carbon fibre, fibreglass), the inlay (plain, points, veneered points, diamonds, rings) and the wrap (Irish linen, leather, none). Cues are kept with the settings and in backups. The referee is `src/js/rules.js`, tested in `tests/rules.test.js`.

**Backup** (Settings tab): Save backup file writes one JSON file with every shot and break, your drills, settings (table, colours, units, section order, speed bar side) and the physics tuning. Restore it from a file or by pasting it: Add keeps what is on the device and adds the records it doesn't have (matched by id); Replace deletes what is there first. Both apply the backup's settings and tuning. The CSV export is still the format for spreadsheets; it can't be read back without losing detail, so it is not a backup.

**Feedback**: Send feedback (Settings, and a link at the bottom of the Log tab) opens the club Google Form with the tab you were on, the app version (`APP_VERSION` in `src/js/feedback.js`) and your phone and browser already filled in. The form was made with `create-feedback-form.gs` (a Google Apps Script) and its answers go to a Google Sheet owned by the repo owner.

Speed is a vertical bar beside the table on all three tabs (drag up for harder). The log sections (table markers, tip, hit, pocket entry and so on) have headings and can be reordered with Rearrange sections at the bottom of the Log tab, which also puts the speed bar on the left or right of the table. Each tab keeps its own order and speed bar side, saved on the device. Stats has its own Cut breaks page: 1-ball make rate, long/short miss pattern, scratch rate, where the cue ball ended up by section and on the table, and tables by break spot, speed and session.

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

`python3 tools/build.py` builds the app into `dist/`: `dist/index.html` is the installable app with its manifest, icons and offline service worker, and `dist/app.html` is the same app as one page fragment (the Claude preview). Pushing to `main` runs the tests, builds and deploys `dist/` to GitHub Pages (`.github/workflows/pages.yml`).

`node --test tests/*.test.js` runs the tests (Node 20 or newer, no installs needed). They run on every pull request too (`.github/workflows/tests.yml`).

### Code layout

The app is a web app: HTML for the structure, CSS for the look, JavaScript for the behaviour. The source is split by job, and the build joins it back into one page.

- `src/head.html`: page title and fonts
- `src/styles.css`: all styles
- `src/markup.html`: the page structure (tabs, Log sections, sheets)
- `src/physics.js`: the ball physics engine, a standalone module the tests load directly
- `src/js/`: the app, one file per job. The build joins them in the order listed in `JS_ORDER` in `tools/build.py`, inside one function, so they share names as if they were one file. A file can use another file's functions anywhere, but a top-level value (`const`, `let`) only from a file above it.
  - Core files with no side effects, so the tests load them without a page: `constants.js`, `util.js` (helpers and units), `geometry.js` (pockets, zones, cut angle, pocket offset), `rules.js` (the Play referee), `csv.js`, `backup.js`, `stats.js`, `stats-breaks.js`
  - App state and storage: `state.js`
  - Screens and drawing: `appearance.js`, `table.js`, `log.js`, `records.js`, `export.js`, `feedback.js`, `shots-list.js`, `settings-view.js`, `examples.js`, `cutbreak.js`, `simulator.js`, `cue.js`, `play.js`, `views.js`
  - Wiring and start-up: `events.js`, `boot.js`
- `src/sw.js`, `src/manifest.webmanifest`, `src/icon-*.png`: the installable app shell
- `tests/`: unit tests for geometry, units, CSV, backup checks, stats, physics and the Play referee, plus checks that the split builds
