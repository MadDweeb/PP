// The ball physics engine (src/physics.js). Inches, seconds; x across the table, y from the head cushion.
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../src/physics.js");

const R = P.R;
const straight = (tipY, extra = {}) => P.simulate({ balls: [{ id: "cb", x: 25, y: 45 }, { id: "ob", x: 25, y: 55 }], cue: 0, aim: Math.PI / 2, tip: { x: 0, y: tipY }, speed: 0.35, tMax: 30 }, extra);
function rack(rows) {
  const out = []; let n = 1;
  rows.forEach((k, r) => { for (let i = 0; i < k; i++) out.push({ id: "b" + n++, x: 25 + (i - (k - 1) / 2) * 2 * R, y: 75 + r * 2 * R * Math.sqrt(3) / 2 }); });
  return out;
}
const breakSpec = (seed, x = 37, speed = 0.9) => ({ balls: [{ id: "cb", x, y: 22 }].concat(rack([1, 2, 3, 2, 1])), cue: 0, aim: Math.atan2(75 - 22, 25 - x), tip: { x: 0, y: -0.1 }, speed, tMax: 25, sample: 1 / 60, seed });

test("draw comes back, stun stops near contact, follow goes through", () => {
  const after = tipY => { const [cb] = straight(tipY).balls; return cb.y - cb.events.find(e => e.type === "hit").y; };
  assert.ok(after(-0.5) < -10, "draw");
  assert.ok(Math.abs(after(-0.1)) < 1, "stun");
  assert.ok(after(0.4) > 10, "follow");
});

test("a straight shot stays on its line", () => {
  const [cb, ob] = straight(0).balls;
  assert.ok(Math.abs(cb.x - 25) < 1e-9 && Math.abs(ob.x - 25) < 1e-9);
});

test("a straight hit passes on (1 + e) / 2 of the cue ball's speed", () => {
  // the cue ball starts a hair from the object ball, so it has no time to slow down first
  const r = P.simulate({ balls: [{ id: "cb", x: 25, y: 55 - 2 * R - 0.05 }, { id: "ob", x: 25, y: 55 }], cue: 0, aim: Math.PI / 2, tip: { x: 0, y: 0 }, speed: 0.35, tMax: 30 }, {});
  const hit = r.balls[1].events.find(e => e.type === "hit");
  const want = (1 + P.DEFAULTS.e_b) / 2 * P.speedOf(0.35, P.DEFAULTS);
  assert.ok(Math.abs(hit.vy - want) / want < 0.01, `object ball leaves at ${hit.vy}, want ${want}`);
});

test("a rolling ball goes v² / (2 μr g)", () => {
  const v0 = P.speedOf(0.2, P.DEFAULTS);
  const r = P.simulate({ balls: [{ id: "cb", x: 25, y: 2 }], cue: 0, aim: Math.PI / 2, tip: { x: 0, y: 0.4 }, speed: 0.2, tMax: 60 }, { L: 10000 });
  const want = v0 * v0 / (2 * P.DEFAULTS.mu_r * P.G);
  assert.ok(Math.abs(r.balls[0].y - 2 - want) / want < 0.01, `rolled ${r.balls[0].y - 2}, theory ${want}`);
});

test("a ball rolled into the side pocket drops", () => {
  const r = P.simulate({ balls: [{ id: "cb", x: 25, y: 50 }], cue: 0, aim: 0, tip: { x: 0, y: 0.4 }, speed: 0.3, tMax: 30 }, {});
  assert.equal(r.balls[0].potted, "SR");
});

test("breaks end with every ball at rest, on the table, not overlapping", () => {
  for (let seed = 1; seed <= 12; seed++) {
    const r = P.simulate(breakSpec(seed, 12 + seed * 2), { vmax: 420 });
    const up = r.balls.filter(b => !b.potted);
    for (const b of up) {
      assert.equal(b.state, "still", `seed ${seed}: ${b.id} still moving at the time limit`);
      assert.ok(b.x >= R - 0.01 && b.x <= 50 - R + 0.01 && b.y >= R - 0.01 && b.y <= 100 - R + 0.01, `seed ${seed}: ${b.id} off the cloth at ${b.x}, ${b.y}`);
    }
    for (let i = 0; i < up.length; i++) for (let j = i + 1; j < up.length; j++)
      assert.ok(Math.hypot(up[i].x - up[j].x, up[i].y - up[j].y) > 2 * R - 0.05, `seed ${seed}: ${up[i].id} and ${up[j].id} overlap`);
  }
});

test("the same seed gives the same break", () => {
  const a = P.simulate(breakSpec(7), { vmax: 420 }), b = P.simulate(breakSpec(7), { vmax: 420 });
  assert.deepEqual(a.balls.map(x => [x.x, x.y, x.potted]), b.balls.map(x => [x.x, x.y, x.potted]));
});

test("the cushion fast path gives exactly the same results as checking every step", () => {
  let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 24; i++) {
    const spec = i % 2 ? breakSpec(i, 12.5 + rnd() * 25, rnd())
      : { balls: [{ id: "cb", x: 3 + rnd() * 44, y: 3 + rnd() * 94 }, { id: "ob", x: 3 + rnd() * 44, y: 3 + rnd() * 94 }], cue: 0, aim: rnd() * 2 * Math.PI, tip: { x: (rnd() - 0.5) * 0.8, y: (rnd() - 0.5) * 0.8 }, speed: rnd(), tMax: 25, seed: i };
    const params = i % 2 ? { vmax: 420 } : {};
    const fast = P.simulate(spec, params), slow = P.simulate(spec, Object.assign({ _noFastPath: true }, params));
    assert.deepEqual(fast.balls.map(b => [b.x, b.y, b.potted, b.events.length]), slow.balls.map(b => [b.x, b.y, b.potted, b.events.length]), `case ${i}`);
  }
});
