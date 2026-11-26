# Ball physics prototype

A standalone pool physics simulator, kept separate from the shot log app.
Nothing here is built into the app or deployed to GitHub Pages.

- `physics.js`: the engine. Top-down table, 3D spin. Sliding then rolling on the
  cloth, side-spin decay, ball-ball collisions with friction (cut and spin throw),
  cushions with friction (side spin changes the rebound), pocket mouths with jaw
  points. Not modelled: swerve, massé, jumps, cushion height, jaw facings.
- `sim.html`: the page. Drag the cue ball, object ball and target ring, tap a
  pocket to aim, set the tip point and speed, and see the predicted paths.
  "Tune to your table" changes the friction and cushion settings.
- `test/check.js`: physics sanity checks (`node prototype/test/check.js`).

To try it locally, serve the folder (for example `python3 -m http.server` in
`prototype/`) and open `sim.html`.

Units are inches and seconds, in the app's table coordinates (x from the left
cushion, y from the head cushion).
