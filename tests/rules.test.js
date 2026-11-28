// The Play mode referee (src/js/rules.js): racks, fouls, calls, push outs and wins for 8-, 9- and 10-ball.
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadCore } = require("./core.js");
const P = require("../src/physics.js");

const A = loadCore();
const R = A.R_BALL;
const rnd = seed => { let a = seed >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
const rack = (k, seed = 1) => A.newRack(k, 0, [0, 0], { rnd: rnd(seed), gap: 0 });
/* a hand-made shot result */
const facts = o => Object.assign({ first: null, rail: true, railBalls: 0, pocketed: [], off: [], cbPocket: null, cbOff: false, cb: { x: 25, y: 30 }, rest: [] }, o);
/* the game in play, with only these balls left */
const playing = (k, ns, extra = {}) => Object.assign(rack(k), { phase: "play", inHand: null, cb: { x: 25, y: 30 }, balls: ns.map((n, i) => ({ n, x: 5 + i * 3, y: 80 })) }, extra);
const restOf = (g, gone) => g.balls.filter(b => !gone.includes(b.n));

test("racks put the right balls in the fixed spots, on the foot spot, touching", () => {
  for (const seed of [1, 2, 3]) {
    const r9 = A.rackLayout("9", 50, 100, rnd(seed), 0);
    assert.equal(r9.length, 9); assert.equal(r9[0].n, 1); assert.equal(r9[4].n, 9);
    assert.deepEqual([r9[0].x, r9[0].y], [25, 75]);
    assert.deepEqual(r9.map(b => b.n).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const r10 = A.rackLayout("10", 50, 100, rnd(seed), 0);
    assert.equal(r10[0].n, 1); assert.equal(r10[4].n, 10); assert.equal(r10.length, 10);
    const r8 = A.rackLayout("8", 50, 100, rnd(seed), 0);
    assert.equal(r8.length, 15); assert.equal(r8[4].n, 8);
    assert.notEqual(A.groupOf(r8[10].n), A.groupOf(r8[14].n), "one solid and one stripe in the back corners");
    assert.ok(Math.abs(Math.hypot(r8[1].x - r8[0].x, r8[1].y - r8[0].y) - 2 * R) < 1e-9);
  }
});

test("a spotted ball goes on the foot spot, or just behind a ball that is on it", () => {
  assert.deepEqual(A.spotBall(9, [], null, 50, 100), { n: 9, x: 25, y: 75 });
  const s = A.spotBall(9, [{ n: 3, x: 25, y: 75 }], null, 50, 100);
  assert.equal(s.x, 25); assert.ok(s.y >= 75 + 2 * R - 1e-6 && s.y < 75 + 2 * R + .02);
});

test("9-ball break: 9 on a legal break wins; too few balls to a rail is a foul with ball in hand", () => {
  const g = rack("9");
  const win = A.ref(g, facts({ first: 1, pocketed: [{ n: 9, pocket: "FL" }], railBalls: 5, rest: restOf(g, [9]) }));
  assert.equal(win.over.winner, 0); assert.deepEqual(win.score, [1, 0]);
  const weak = A.ref(g, facts({ first: 1, railBalls: 2, rest: g.balls }));
  assert.equal(weak.turn, 1); assert.equal(weak.inHand, "anywhere"); assert.match(weak.last.fouls[0], /Only 2 balls/);
  const wrong = A.ref(g, facts({ first: 4, railBalls: 6, rest: g.balls }));
  assert.match(wrong.last.fouls[0], /Wrong ball contacted/);
});

test("9-ball: lowest ball first, any ball down keeps the turn, a combo on the 9 wins", () => {
  const g = playing("9", [3, 5, 9]);
  const keep = A.ref(g, facts({ first: 3, pocketed: [{ n: 5, pocket: "SR" }], rest: restOf(g, [5]) }));
  assert.equal(keep.turn, 0); assert.deepEqual(keep.last.fouls, []);
  const combo = A.ref(g, facts({ first: 3, pocketed: [{ n: 9, pocket: "FR" }], rest: restOf(g, [9]) }));
  assert.equal(combo.over.winner, 0);
  const wrong = A.ref(g, facts({ first: 5, pocketed: [{ n: 9, pocket: "FR" }], rest: restOf(g, [9]) }));
  assert.equal(wrong.over, null, "a 9 made on a foul doesn't win");
  assert.ok(wrong.balls.some(b => b.n === 9), "and is spotted"); assert.equal(wrong.turn, 1); assert.equal(wrong.inHand, "anywhere");
  const noRail = A.ref(g, facts({ first: 3, rail: false, rest: g.balls }));
  assert.match(noRail.last.fouls[0], /No ball reached a rail/);
  const scratch = A.ref(g, facts({ first: 3, cbPocket: "HL", cb: null, rest: g.balls }));
  assert.match(scratch.last.fouls[0], /Scratch/); assert.equal(scratch.cb, null); assert.equal(scratch.inHand, "anywhere");
});

test("three fouls in a row lose the rack in 9- and 10-ball, a good shot resets the count", () => {
  let g = playing("9", [2, 9]);
  const foul = gg => A.ref(Object.assign({}, gg, { turn: 0 }), facts({ first: null, rest: gg.balls }));
  g = foul(g); g = foul(g); assert.equal(g.fouls[0], 2); assert.equal(g.over, null);
  const reset = A.ref(Object.assign({}, g, { turn: 0 }), facts({ first: 2, rest: g.balls }));
  assert.equal(reset.fouls[0], 0);
  g = foul(g); assert.equal(g.over.winner, 1); assert.match(g.over.why, /Three fouls/);
  let e = playing("8", [1, 9, 8], { groups: { 0: "solids", 1: "stripes" } });
  for (let i = 0; i < 3; i++) e = A.ref(Object.assign({}, e, { turn: 0 }), facts({ first: null, rest: e.balls }));
  assert.equal(e.over, null, "8-ball has no three-foul rule");
});

test("push out: only after a foul-free break and only without a line of sight to the lowest ball", () => {
  const g = rack("9");
  const after = A.ref(g, facts({ first: 1, railBalls: 6, rest: g.balls.map(b => b.n === 1 ? { n: 1, x: 10, y: 50 } : b), cb: { x: 40, y: 20 } }));
  assert.equal(after.pushOK, true); assert.equal(after.turn, 1);
  const open = Object.assign({}, after, { cb: { x: 10, y: 30 }, balls: [{ n: 1, x: 10, y: 50 }, { n: 2, x: 40, y: 80 }] });
  assert.equal(A.pushAvailable(open), false, "a clear look at the 1: no push");
  const hidden = Object.assign({}, open, { balls: [{ n: 1, x: 10, y: 50 }, { n: 2, x: 10, y: 40 }] });
  assert.equal(A.pushAvailable(hidden), true, "the 2 sits right in the way");
  const later = Object.assign({}, hidden, { pushOK: false });
  assert.equal(A.pushAvailable(later), false, "not after the first shot");
  const pushed = A.ref(hidden, facts({ first: null, rail: false, rest: hidden.balls, cb: { x: 30, y: 40 } }), { push: true });
  assert.deepEqual(pushed.last.fouls, [], "no wrong-ball or rail fouls on a push");
  assert.equal(pushed.choice.kind, "push"); assert.equal(pushed.choice.by, 0);
  assert.equal(A.choose(pushed, "pass").turn, 1); assert.equal(A.choose(pushed, "shoot").turn, 0);
  assert.equal(pushed.pushOK, false);
  const scratchPush = A.ref(hidden, facts({ cbPocket: "SL", cb: null, rest: hidden.balls }), { push: true });
  assert.match(scratchPush.last.fouls[0], /Scratch/);
});

test("a partly blocked ball still counts as in sight", () => {
  assert.equal(A.canSee({ x: 10, y: 30 }, { x: 10, y: 50 }, [{ x: 10 + 2.2, y: 40 }]), true);
  assert.equal(A.canSee({ x: 10, y: 30 }, { x: 10, y: 50 }, [{ x: 10 + .5, y: 40 }]), false);
});

test("10-ball: called ball in the called pocket keeps the turn; anything else gives the option", () => {
  const g = playing("10", [2, 4, 10]);
  const good = A.ref(g, facts({ first: 2, pocketed: [{ n: 4, pocket: "FL" }], rest: restOf(g, [4]) }), { call: { ball: 4, pocket: "FL" } });
  assert.equal(good.turn, 0);
  const wrongPocket = A.ref(g, facts({ first: 2, pocketed: [{ n: 4, pocket: "FR" }], rest: restOf(g, [4]) }), { call: { ball: 4, pocket: "FL" } });
  assert.equal(wrongPocket.choice.kind, "option"); assert.equal(wrongPocket.choice.by, 1);
  assert.ok(!wrongPocket.balls.some(b => b.n === 4), "the ball stays down");
  const early10 = A.ref(g, facts({ first: 2, pocketed: [{ n: 10, pocket: "SL" }], rest: restOf(g, [10]) }), { call: { ball: 10, pocket: "SL" } });
  assert.equal(early10.over, null, "an early 10 doesn't win"); assert.ok(early10.balls.some(b => b.n === 10)); assert.equal(early10.turn, 0);
  const last = playing("10", [10]);
  const win = A.ref(last, facts({ first: 10, pocketed: [{ n: 10, pocket: "SL" }], rest: [] }), { call: { ball: 10, pocket: "SL" } });
  assert.equal(win.over.winner, 0);
  const brk = A.ref(rack("10"), facts({ first: 1, railBalls: 5, pocketed: [{ n: 10, pocket: "HL" }], rest: restOf(rack("10"), [10]) }));
  assert.equal(brk.over, null); assert.ok(brk.balls.some(b => b.n === 10), "10 on the break is spotted"); assert.equal(brk.turn, 0);
});

test("8-ball: open table, groups go to the first called ball made, 8 early or uncalled loses", () => {
  const g = rack("8");
  const brk = A.ref(g, facts({ first: 3, railBalls: 7, pocketed: [{ n: 12, pocket: "FR" }], rest: restOf(g, [12]) }));
  assert.equal(brk.turn, 0); assert.equal(brk.groups, null, "the table stays open after the break");
  const sol = A.ref(brk, facts({ first: 5, pocketed: [{ n: 5, pocket: "SL" }], rest: brk.balls.filter(b => b.n !== 5) }), { call: { ball: 5, pocket: "SL" } });
  assert.equal(sol.groups[0], "solids"); assert.equal(sol.groups[1], "stripes"); assert.equal(sol.turn, 0);
  const eightFirst = A.ref(brk, facts({ first: 8, rest: brk.balls }), { call: { ball: 3, pocket: "SL" } });
  assert.match(eightFirst.last.fouls[0], /Wrong ball contacted/);
  const early = A.ref(sol, facts({ first: 1, pocketed: [{ n: 8, pocket: "FL" }], rest: sol.balls.filter(b => b.n !== 8) }), { call: { ball: 1, pocket: "HL" } });
  assert.equal(early.over.winner, 1); assert.match(early.over.why, /before clearing/);
  const end = playing("8", [8, 9], { groups: { 0: "solids", 1: "stripes" } });
  const won = A.ref(end, facts({ first: 8, pocketed: [{ n: 8, pocket: "FL" }], rest: restOf(end, [8]) }), { call: { ball: 8, pocket: "FL" } });
  assert.equal(won.over.winner, 0);
  const wrongPk = A.ref(end, facts({ first: 8, pocketed: [{ n: 8, pocket: "FR" }], rest: restOf(end, [8]) }), { call: { ball: 8, pocket: "FL" } });
  assert.equal(wrongPk.over.winner, 1);
  const scratch8 = A.ref(end, facts({ first: 8, cbPocket: "HL", cb: null, pocketed: [{ n: 8, pocket: "FL" }], rest: restOf(end, [8]) }), { call: { ball: 8, pocket: "FL" } });
  assert.equal(scratch8.over.winner, 1);
  const safe = A.ref(sol, facts({ first: 2, pocketed: [{ n: 2, pocket: "SR" }], rest: sol.balls.filter(b => b.n !== 2) }), { call: { safety: true } });
  assert.equal(safe.turn, 1); assert.ok(!safe.balls.some(b => b.n === 2));
});

test("8-ball breaks: illegal break and 8 on the break give the right player a choice", () => {
  const g = rack("8");
  const weak = A.ref(g, facts({ first: 1, railBalls: 2, rest: g.balls }));
  assert.equal(weak.choice.kind, "illegalBreak"); assert.equal(weak.choice.by, 1); assert.deepEqual(weak.last.fouls, []);
  const re = A.choose(weak, "rerack", { rnd: rnd(5) });
  assert.equal(re.phase, "break"); assert.equal(re.turn, 1); assert.equal(re.balls.length, 15);
  const eight = A.ref(g, facts({ first: 1, railBalls: 6, pocketed: [{ n: 8, pocket: "SL" }], rest: restOf(g, [8]) }));
  assert.equal(eight.choice.kind, "eightBreak"); assert.equal(eight.choice.by, 0);
  const spot = A.choose(eight, "spot");
  assert.ok(spot.balls.some(b => b.n === 8)); assert.equal(spot.turn, 0);
  const sc = A.ref(g, facts({ first: 1, railBalls: 6, cbPocket: "SR", cb: null, rest: g.balls }));
  assert.equal(sc.turn, 1); assert.equal(sc.inHand, "kitchen");
});

test("shotFacts reads a real simulated shot: first ball hit, balls down, rails", () => {
  // straight in: the cue ball sends the 1 into the foot-right corner
  const r = P.simulate({ balls: [{ id: "cb", x: 25, y: 50 }, { id: "b1", x: 37.5, y: 75 }, { id: "b2", x: 5, y: 20 }], cue: 0, aim: Math.atan2(75 - 50 - (75 - 50) / Math.hypot(12.5, 25) * 2 * R, 12.5 - 12.5 / Math.hypot(12.5, 25) * 2 * R), tip: { x: 0, y: -.3 }, speed: .4, tMax: 20 }, {});
  const f = A.shotFacts(r);
  assert.equal(f.first, 1);
  assert.deepEqual(f.pocketed, [{ n: 1, pocket: "FR" }]);
  assert.equal(f.rest.length, 1); assert.equal(f.rest[0].n, 2);
  assert.ok(f.cb);
});
