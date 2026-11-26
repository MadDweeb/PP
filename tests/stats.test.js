// Stats maths.
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadCore } = require("./core");

test("summary: pot rate counts only shots with a result; averages and spread", () => {
  const app = loadCore();
  const s = app.summarize([
    { outcome: "made", cbErr: 2, pocketOff: 0.5, inZone: 1 }, { outcome: "missed", cbErr: 4, pocketOff: -0.5, inZone: 0 },
    { outcome: null, cbErr: null, pocketOff: null, inZone: null }, { outcome: "made", cbErr: 6, pocketOff: 0.3 }
  ]);
  assert.equal(s.n, 4); assert.equal(s.potN, 3); assert.equal(s.pot, 2 / 3);
  assert.equal(s.err, 4); assert.equal(s.zone, 0.5);
  assert.ok(Math.abs(s.bias - 0.1) < 1e-12);
  assert.ok(Math.abs(s.spread - app.sd([0.5, -0.5, 0.3])) < 1e-12);
  assert.equal(app.sd([1]), null); assert.equal(app.mean([]), null);
});

test("cue ball miss in the shot's own frame: long/short along the travel line, right/left across it", () => {
  const app = loadCore();
  // travelling up the table (+y, toward the foot) from the object ball to the target
  const base = { ob: { x: 25, y: 50 }, target: { x: 25, y: 70 } };
  assert.deepEqual(app.missLR(Object.assign({ cbDx: 0, cbDy: 2 }, base)), { long: 2, side: 0 });
  const r = app.missLR(Object.assign({ cbDx: 1.5, cbDy: -1 }, base));
  assert.equal(r.long, -1); assert.equal(r.side, 1.5);                 // +x is the shooter's right
  assert.equal(app.missLR(Object.assign({ cbDx: 1, cbDy: 1 }, base, { target: { x: 25, y: 51 } })), null);   // too short to have a direction
});

test("cut angle bands", () => {
  const app = loadCore();
  assert.deepEqual([0, 9.9, 10, -30, 45, null].map(c => app.cutBand({ cut: c })), [0, 0, 1, 2, 3, null]);
});

test("break summary: make rate, long misses, scratches", () => {
  const app = loadCore();
  const s = app.brkSummary([
    { outcome: "made", rail: 0.5, cbSec: "centre" }, { outcome: "missed", rail: 3, cbSec: "upper" },
    { outcome: "missed", rail: -2, scratch: 1, cbSec: "scratch" }, { outcome: "rattled", rail: 2 }
  ]);
  assert.equal(s.n, 4); assert.equal(s.made, 0.25);
  assert.equal(s.missN, 3); assert.equal(s.long, 2 / 3);
  assert.equal(s.scratch, 0.25); assert.equal(s.ctl, 1 / 3);
});
