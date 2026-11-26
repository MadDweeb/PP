// Table geometry, spin labels and units. Coordinates are inches: x from the left cushion, y from the head cushion.
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadCore } = require("./core");

const near = (a, b, eps = 1e-6, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg || ""} expected ${b}, got ${a}`);

test("pocket mouths are the set widths", () => {
  const app = loadCore();
  const P = app.pockets();
  for (const k of ["HL", "HR", "FL", "FR"]) near(app.len(app.sub(P[k].p1, P[k].p2)), 4.25, 1e-9, k);
  for (const k of ["SL", "SR"]) near(app.len(app.sub(P[k].p1, P[k].p2)), 4.75, 1e-9, k);
  near(P.SR.c.x, 50); near(P.SR.c.y, 50);
});

test("cut angle: 0 when straight, + for a cut to the right", () => {
  const app = loadCore(); const pk = app.pockets().SR;      // mouth centre (50, 50)
  near(app.cutAngle({ x: 30, y: 50 }, { x: 40, y: 50 }, pk), 0, 1e-9);
  // cue ball below the line (head side): the object ball goes off to the shooter's right
  const a = app.cutAngle({ x: 30, y: 40 }, { x: 40, y: 50 }, pk);
  assert.ok(a > 0, "cut to the right is +");
  near(a, Math.atan2(10, 40 - 2 * 1.125 - 30) * 180 / Math.PI, 1e-9);
  assert.ok(app.cutAngle({ x: 30, y: 60 }, { x: 40, y: 50 }, pk) < 0, "cut to the left is -");
});

test("pocket offset: + is right of centre seen from the object ball; aim error in degrees", () => {
  const app = loadCore(); const pk = app.pockets().SR; const ob = { x: 40, y: 50 };
  // facing the side pocket (+x), your right hand points to the head end (-y)
  near(app.pocketOffset({ x: 50, y: 49 }, pk, ob), 1);
  near(app.pocketOffset({ x: 50, y: 51 }, pk, ob), -1);
  near(app.aimErrorDeg(1, pk, ob), Math.atan(1 / 10) * 180 / Math.PI);
  assert.equal(app.pocketOffset(null, pk, ob), null);
});

test("grid zones: A1 is the head-left corner", () => {
  const app = loadCore();
  assert.equal(app.zone({ x: 1, y: 1 }, 4, 8), "A1");
  assert.equal(app.zone({ x: 49, y: 99 }, 4, 8), "D8");
  assert.equal(app.zone({ x: 50, y: 100 }, 8, 16), "H16");          // on the edge stays in the last cell
  assert.equal(app.zone(null, 4, 8), "");
});

test("target zones", () => {
  const app = loadCore(); const t = { x: 30, y: 70 };
  assert.equal(app.zoneShape(t, "point"), null);
  const c3 = app.zoneShape(t, "c3");
  assert.equal(app.inZone({ x: 32.9, y: 70 }, c3), true);
  assert.equal(app.inZone({ x: 33.1, y: 70 }, c3), false);
  const dia = app.zoneShape(t, "dia");                           // diamond box: 12.5 x 12.5 cell holding the target
  assert.deepEqual([dia.x0, dia.y0, dia.x1, dia.y1], [25, 62.5, 37.5, 75]);
});

test("cut break sections split at the 3rd and 5th diamonds", () => {
  const app = loadCore();
  assert.equal(app.sectionOf({ x: 25, y: 37 }), "lower");
  assert.equal(app.sectionOf({ x: 25, y: 50 }), "centre");
  assert.equal(app.sectionOf({ x: 25, y: 63 }), "upper");
  assert.equal(app.secOf({ kind: "break", scratch: 1 }), "scratch");
});

test("spin names from the tip point", () => {
  const app = loadCore();
  const v = y => app.vspinOf({ x: 0, y });
  assert.deepEqual([v(.5), v(.4), v(.2), v(.11), v(0), v(-.11), v(-.12), v(-.39), v(-.4)],
    ["follow", "follow", "stunrun", "stun", "stun", "stun", "stundraw", "stundraw", "draw"]);
  assert.deepEqual([app.sideOf({ x: -.2 }), app.sideOf({ x: 0 }), app.sideOf({ x: .12 })], ["L", "C", "R"]);
  assert.deepEqual([0, 24, 25, 50, 75, 100].map(app.speedOf), [1, 1, 2, 3, 4, 4]);
});

test("units: stored in inches, shown in cm in metric", () => {
  const app = loadCore();
  assert.equal(app.fls(10, 1), "10.0 in");
  app.settings.units = "metric";
  assert.equal(app.fls(10, 1), "25.4 cm");
  assert.equal(app.fls(10, 2), "25.4 cm");        // 2 decimals of an inch show as 1 decimal of a cm
  near(app.fromU(2.54), 1);
});
