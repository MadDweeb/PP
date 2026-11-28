# Pool Shot Log

## Use it

Works on **Android and iPhone**.

1. Open **https://maddweeb.github.io/PP/**: in Chrome on Android, in Safari on iPhone.
2. Add it to your Home Screen:
   - **Android:** tap ⋮ → **Add to Home screen** (or **Install app**).
   - **iPhone:** tap **Share** → **Add to Home Screen**.
3. That's it. It works offline, and your shots stay on your phone.

On iPhone, vibration and the browser's full screen aren't available to web apps; everything else works the same.

Save a backup now and then (Settings → Backup), in case the browser's data gets cleared.

## What it is

A free practice log for pool, on a to-scale 9 ft table. Set up a shot, play it for real, then mark what happened. The app works out how accurate you were.

**Shots.** For each shot you mark:

- where the cue ball and object ball started, and the pocket
- where you wanted the cue ball to finish, and where it stopped
- where the object ball crossed the pocket mouth
- tip contact point, speed, and made / rattled / missed

Use a starter drill or save your own. Shots group into sessions (a new one starts after 2 hours off).

**Cut break.** Log real breaks: break spot, rack, how full you hit the 1-ball, where the 1-ball reached the side rail (long or short), where the cue ball ended up, and balls made. A predicted path shows what physics expects; tune it to your table.

**Simulator.** A physics sandbox. Try a shot or a break and watch the balls roll. Nothing here is saved to your log.

**Play.** 8, 9 or 10-ball for one or two players on one phone, refereed by WPA rules (2025). One house rule: push out only on the shot after a foul-free break, and only with no straight line to the lowest ball. Drag to aim, turn the phone sideways for full screen, and pick your own cue.

**Stats.** Pot rate, cue ball accuracy, pocket bias, session-by-session progress, and a separate page for cut breaks.

**Export.** Every shot as CSV for your own analysis. A JSON backup holds everything and can be restored on any phone.

**Feedback.** Settings → Send feedback opens a short Google Form.

## CSV columns

Distances are in inches (or cm if you pick metric; the column names change from `_in` to `_cm`).

- `x`, `y`: ball centre, measured from the left long cushion and the head cushion, seen from the head end.
- Zones: column letter from the left, row number from the head rail (`A1` is head-left).
- `cut_angle_deg`: + is a cut to the right.
- `pocket_offset_in`: + is right of pocket centre, seen from the object ball. `aim_error_deg` is the same as an angle.
- `cb_error_in`: distance from the cue ball target to where it stopped (`dx`, `dy` give the direction).
- `session_id`: practice session. `target_zone`: `point`, `c3`, `c6`, `half` or `dia`. `cb_in_zone`: 1 or 0.
- `record_type`: `shot` or `break`. Break rows also have `ob1_rail_offset_in` (+ long, − short), `cb_section`, `cb_scratch`, `balls_made`, `break_rack`, `ob1_hit_offset_balls` (0 full, ±0.5 half ball) and `ob1_pred_rail_offset_in` (the prediction).

## Develop

- Test: `node --test tests/*.test.js` (Node 20+, no installs)
- Build: `python3 tools/build.py` → `dist/index.html` (the app) and `dist/app.html` (one-page preview)
- Pushing to `main` tests, builds and deploys to GitHub Pages. Tests also run on every pull request.

### Code layout

The source is split by job; the build joins it into one page.

- `src/head.html`, `src/styles.css`, `src/markup.html`: title, styles, page structure
- `src/physics.js`: ball physics, also run in a Web Worker (`src/js/physworker.js`)
- `src/js/*.js`: the app, joined in the order of `JS_ORDER` in `tools/build.py`. A file can call another's functions anywhere, but use a top-level `const`/`let` only from a file above it.
  - Core, no side effects (tested directly): `constants.js`, `util.js`, `geometry.js`, `rules.js` (Play referee), `csv.js`, `backup.js`, `stats.js`, `stats-breaks.js`
  - State and storage: `state.js`
  - Screens: `appearance.js`, `table.js`, `log.js`, `records.js`, `export.js`, `feedback.js`, `shots-list.js`, `settings-view.js`, `examples.js`, `cutbreak.js`, `simulator.js`, `cue.js`, `play.js`, `views.js`
  - Wiring and start-up: `device.js`, `events.js`, `boot.js`
- `src/sw.js`, `src/manifest.webmanifest`, `src/icon-*.png`: installable app shell
- `tests/`: geometry, units, CSV, backup, stats, physics, referee, and build checks
