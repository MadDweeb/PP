/* Pool ball physics (same engine as prototype/physics.js on the prototype branch), used by Cut break mode for the predicted 1-ball line.
 *
 * Top-down (2D table, 3D spin). Units: inches, seconds, radians.
 * Axes: x across the table (0 = left cushion), y along it (0 = head cushion),
 * z up out of the cloth. Same table coordinates as the shot log app.
 *
 * Model (after Alciatore, Leckie & Greenspan, Mathavan):
 *  - sliding: cloth friction mu_s acts against the contact-point velocity
 *    until the ball rolls; then rolling resistance mu_r slows it
 *  - side spin (z) decays with mu_sp
 *  - ball-ball: elastic normal impulse plus a friction impulse at the
 *    contact point (gives cut-induced and spin-induced throw, and passes
 *    some spin across)
 *  - cushions: restitution plus friction at the nose, so side spin changes
 *    the rebound angle
 *  - pockets: rail cushions stop at the pocket mouth; the jaw tips are
 *    hard points; a ball whose centre crosses the mouth line drops
 * Not modelled: swerve/masse, jumping, cushion height, jaw facings.
 */
(function (root) {
"use strict";

const G = 386.09;              // gravity, in/s^2
const R = 1.125;               // ball radius, in

const DEFAULTS = {
  W: 50, L: 100,               // playing surface, in (9 ft table)
  wc: 4.25, ws: 4.75,          // pocket mouths, in
  mu_s: 0.20,                  // sliding friction, ball on cloth
  mu_r: 0.010,                 // rolling resistance
  mu_sp: 0.02,                 // spinning (side spin) friction
  e_b: 0.95,                   // ball-ball restitution
  pack: 0.5,                   // rack tightness: share of the balls behind a still, frozen ball that move with it when it is hit (0 = loose balls)
  e_c: 0.80,                   // cushion restitution
  mu_c: 0.20,                  // cushion friction
  vmax: 300,                   // cue ball speed at 100 %, in/s (about 7.6 m/s)
  vmin: 15,                    // cue ball speed at 0 %, in/s
  curve: 1.6,                  // speed bar shape: soft/medium/firm/power mid-points come out near 1, 2, 3.7, 6.3 m/s
  squirt: 1.5,                 // cue ball deflection in degrees at half a radius of side (0 = off)
  vbreak: 420                  // cue ball speed at 100 % in break mode, in/s (about 24 mph)
};

/* small vector helpers (3D arrays for spin, {x,y} for positions) */
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const hyp = Math.hypot;

function makeBall(id, p) {
  return { id, x: p.x, y: p.y, vx: 0, vy: 0, w: [0, 0, 0], state: "still", potted: null, path: [{ x: p.x, y: p.y, t: 0 }], events: [] };
}

/* contact-point velocity on the cloth: v + w x (-R z) */
function slipVel(b) { return { x: b.vx - R * b.w[1], y: b.vy + R * b.w[0] }; }

function speedOf(pct, P) { return P.vmin + (P.vmax - P.vmin) * Math.pow(Math.max(0, Math.min(1, pct)), P.curve || 1); }

/* Strike: speed fraction 0..1, aim angle (radians, table coords), tip offset {x: side, y: height} in ball radii */
function strike(ball, aim, tip, pct, P) {
  const v0 = speedOf(pct, P);
  const sq = (P.squirt || 0) * Math.PI / 180 * (tip.x / 0.5);   // deflects away from the side used
  const a = aim - sq;
  const dx = Math.cos(a), dy = Math.sin(a);
  ball.vx = v0 * dx; ball.vy = v0 * dy;
  // Spin from a level cue: |w| = 5 v * offset / (2 R)  (offset in radii already scaled by R)
  const top = 5 * v0 * tip.y / (2 * R);          // + = follow, - = draw
  const side = -5 * v0 * tip.x / (2 * R);        // right english spins clockwise from above
  // topspin axis is z x d  ->  rolling forward has w_h = (z x v)/R
  ball.w = [-dy * top, dx * top, side];
  ball.state = "moving";
}

/* Table edges as segments (cushion noses at the playing surface edge; ball centre stops R away) */
function geometry(P) {
  const { W, L, wc, ws } = P, a = wc / Math.SQRT2;
  const pockets = {
    HL: { p1: { x: a, y: 0 }, p2: { x: 0, y: a } },
    HR: { p1: { x: W, y: a }, p2: { x: W - a, y: 0 } },
    FL: { p1: { x: 0, y: L - a }, p2: { x: a, y: L } },
    FR: { p1: { x: W - a, y: L }, p2: { x: W, y: L - a } },
    SL: { p1: { x: 0, y: L / 2 + ws / 2 }, p2: { x: 0, y: L / 2 - ws / 2 } },
    SR: { p1: { x: W, y: L / 2 - ws / 2 }, p2: { x: W, y: L / 2 + ws / 2 } }
  };
  // each mouth: outward normal so "beyond the line" = dropped
  const ctr = { x: W / 2, y: L / 2 };
  for (const k in pockets) {
    const m = pockets[k]; m.c = { x: (m.p1.x + m.p2.x) / 2, y: (m.p1.y + m.p2.y) / 2 };
    let nx = m.p2.y - m.p1.y, ny = -(m.p2.x - m.p1.x); const l = hyp(nx, ny); nx /= l; ny /= l;
    if ((m.c.x - ctr.x) * nx + (m.c.y - ctr.y) * ny < 0) { nx = -nx; ny = -ny; }
    m.n = { x: nx, y: ny };
  }
  // cushions: axis-aligned spans with inward normal
  const cushions = [
    { axis: "x", at: 0, n: 1, from: a, to: L / 2 - ws / 2 }, { axis: "x", at: 0, n: 1, from: L / 2 + ws / 2, to: L - a },
    { axis: "x", at: W, n: -1, from: a, to: L / 2 - ws / 2 }, { axis: "x", at: W, n: -1, from: L / 2 + ws / 2, to: L - a },
    { axis: "y", at: 0, n: 1, from: a, to: W - a }, { axis: "y", at: L, n: -1, from: a, to: W - a }
  ];
  // jaw tips (cushion ends) are hard points
  const jaws = [];
  for (const k in pockets) jaws.push(pockets[k].p1, pockets[k].p2);
  return { pockets, cushions, jaws, a };
}

/* One time step for a single ball on the cloth */
function clothStep(b, dt, P) {
  if (b.state === "still" || b.potted) return;
  // side spin decays independently
  if (b.w[2] !== 0) {
    const dwz = 5 * P.mu_sp * G / (2 * R) * dt;
    b.w[2] = Math.abs(b.w[2]) <= dwz ? 0 : b.w[2] - Math.sign(b.w[2]) * dwz;
  }
  const u = slipVel(b), us = hyp(u.x, u.y);
  const dvSlide = P.mu_s * G * dt;
  if (us > 3.5 * dvSlide) {
    // sliding: friction opposes slip; slip shrinks at 7/2 mu_s g
    const ux = u.x / us, uy = u.y / us;
    b.vx -= dvSlide * ux; b.vy -= dvSlide * uy;
    const k = 5 * P.mu_s * G / (2 * R) * dt;
    b.w[0] -= k * uy; b.w[1] += k * ux;
    if (b.state !== "sliding") { b.state = "sliding"; }
  } else {
    // rolling: lock spin to velocity, decelerate
    if (b.state === "sliding") b.events.push({ t: b._t, type: "roll", x: b.x, y: b.y });
    b.state = "rolling";
    const v = hyp(b.vx, b.vy), dv = P.mu_r * G * dt;
    if (v <= dv) { b.vx = 0; b.vy = 0; }
    else { b.vx -= dv * b.vx / v; b.vy -= dv * b.vy / v; }
    b.w[0] = -b.vy / R; b.w[1] = b.vx / R;
  }
  b.x += b.vx * dt; b.y += b.vy * dt;
  if (hyp(b.vx, b.vy) < 1e-3 && Math.abs(b.w[2]) < 0.05) {
    b.vx = b.vy = 0; b.w = [0, 0, 0]; b.state = "still";
    b.events.push({ t: b._t, type: "stop", x: b.x, y: b.y });
  }
}

/* Ball-ball collision with friction at the contact point (throw). Alciatore's speed-dependent friction fit. */
function ballBall(A, B, P, t) {
  if (A.state === "still" && B.state !== "still") { const T = A; A = B; B = T; }   // A is the moving ball
  let nx = B.x - A.x, ny = B.y - A.y; const d = hyp(nx, ny);
  if (d >= 2 * R || d === 0) return false;
  nx /= d; ny /= d;
  const rvn = (A.vx - B.vx) * nx + (A.vy - B.vy) * ny;
  if (rvn <= 0) return false;                         // separating
  // push apart to touching
  const ov = (2 * R - d) / 2; A.x -= nx * ov; A.y -= ny * ov; B.x += nx * ov; B.y += ny * ov;
  /* Tight rack: a still ball frozen against still balls behind it can't move off on its own; the balls behind take
     part of the push at the same instant, so the ball that hits it meets a heavier target and comes back off it more
     steeply. This is what sends the 1-ball back toward a side pocket off the second row. Not applied to the cue ball's
     own hit, so the break's first contact is unchanged. */
  const backers = []; let M = 1;
  if (P.pack > 0 && B.state === "still" && A.id !== "cb" && P._balls) {
    for (const C of P._balls) {
      if (C === A || C === B || C.potted || C.state !== "still") continue;
      const ux = C.x - B.x, uy = C.y - B.y, du = hyp(ux, uy);
      if (du > 2 * R + 0.01) continue;
      const w = (ux * nx + uy * ny) / du;
      if (w > 0.05) { backers.push([C, ux / du, uy / du, w]); M += P.pack * w * w; }
    }
  }
  const Jn = (1 + P.e_b) * M / (1 + M) * rvn;         // per unit mass of A; (1 + e)/2 rvn when nothing is behind B
  // contact point velocities (3D)
  const n3 = [nx, ny, 0];
  const wA = cross(A.w, n3.map(c => c * R)), wB = cross(B.w, n3.map(c => -c * R));
  const vc = [A.vx + wA[0] - B.vx - wB[0], A.vy + wA[1] - B.vy - wB[1], wA[2] - wB[2]];
  const vcn = vc[0] * nx + vc[1] * ny;
  const vt = [vc[0] - vcn * nx, vc[1] - vcn * ny, vc[2]], vts = hyp(vt[0], vt[1], vt[2]);
  let Jt = 0, tdir = [0, 0, 0];
  if (vts > 1e-6) {
    const mu = 9.951e-3 + 0.108 * Math.exp(-1.088 * vts * 0.0254);   // vts in m/s
    Jt = Math.min(mu * Jn, vts / 7);                  // stop sliding at most (equal spheres: 2*(1+5/2))
    tdir = vt.map(c => -c / vts);                     // friction on A opposes slip
  }
  // impulses (per unit mass): on A = -Jn n + Jt tdir ; on B = opposite
  A.vx += -Jn * nx + Jt * tdir[0]; A.vy += -Jn * ny + Jt * tdir[1];
  const V = Jn / M;                                  // B and the share of the balls behind it move off together
  B.vx += V * nx - Jt * tdir[0]; B.vy += V * ny - Jt * tdir[1];
  for (const [C, ux, uy, w] of backers) { C.vx += P.pack * V * w * ux; C.vy += P.pack * V * w * uy; C.state = "sliding"; C.events.push({ t, type: "hit", other: B.id, x: C.x, y: C.y }); }
  const f = 5 / (2 * R * R);
  const tA = cross(n3.map(c => c * R), tdir.map(c => c * Jt)), tB = cross(n3.map(c => -c * R), tdir.map(c => -c * Jt));
  for (let i = 0; i < 3; i++) { A.w[i] += f * tA[i]; B.w[i] += f * tB[i]; }
  for (const b of [A, B]) { b.state = "sliding"; }
  A.events.push({ t, type: "hit", other: B.id, x: A.x, y: A.y });
  B.events.push({ t, type: "hit", other: A.id, x: B.x, y: B.y, vx: B.vx, vy: B.vy });
  return true;
}

/* Bounce off a surface with inward normal (nx, ny) */
function bounce(b, nx, ny, P, t, what) {
  const vn = b.vx * nx + b.vy * ny;
  if (vn >= 0) return;
  const Jn = -(1 + P.e_c) * vn;                       // per unit mass, along n
  const r = [-nx * R, -ny * R, 0];
  const wr = cross(b.w, r);
  const vc = [b.vx + wr[0], b.vy + wr[1], wr[2]];
  const vcn = vc[0] * nx + vc[1] * ny;
  const vt = [vc[0] - vcn * nx, vc[1] - vcn * ny, vc[2]], vts = hyp(vt[0], vt[1], vt[2]);
  let J = [Jn * nx, Jn * ny, 0];
  if (vts > 1e-6) {
    const Jt = Math.min(P.mu_c * Jn, vts / 3.5);      // single sphere: 1 + 5/2
    J = [J[0] - Jt * vt[0] / vts, J[1] - Jt * vt[1] / vts, -Jt * vt[2] / vts];
  }
  b.vx += J[0]; b.vy += J[1];
  const tq = cross(r, J), f = 5 / (2 * R * R);
  for (let i = 0; i < 3; i++) b.w[i] += f * tq[i];
  b.state = "sliding";
  b.events.push({ t, type: what, x: b.x, y: b.y });
}

function railStep(b, geo, P, t) {
  if (b.potted || b.state === "still") return;
  /* Fast path: a ball more than a radius from every cushion line and outside the corner pocket squares can't touch a
     cushion, a jaw tip or a pocket mouth, so skip the checks. This is most steps and doesn't change the result
     (the tests check that against _noFastPath). */
  const a = geo.a;
  if (!P._noFastPath && b.x > R && b.x < P.W - R && b.y > R && b.y < P.L - R && ((b.x > a && b.x < P.W - a) || (b.y > a && b.y < P.L - a))) return;
  for (const c of geo.cushions) {
    if (c.axis === "x") {
      if (b.y < c.from || b.y > c.to) continue;
      const dist = (b.x - c.at) * c.n;
      if (dist < R) { b.x = c.at + c.n * R; bounce(b, c.n, 0, P, t, "cushion"); }
    } else {
      if (b.x < c.from || b.x > c.to) continue;
      const dist = (b.y - c.at) * c.n;
      if (dist < R) { b.y = c.at + c.n * R; bounce(b, 0, c.n, P, t, "cushion"); }
    }
  }
  for (const j of geo.jaws) {
    const dx = b.x - j.x, dy = b.y - j.y, d = hyp(dx, dy);
    if (d < R && d > 0) { const nx = dx / d, ny = dy / d; b.x = j.x + nx * R; b.y = j.y + ny * R; bounce(b, nx, ny, P, t, "jaw"); }
  }
  for (const k in geo.pockets) {
    const m = geo.pockets[k];
    const s = (b.x - m.c.x) * m.n.x + (b.y - m.c.y) * m.n.y;
    const along = Math.abs((b.x - m.c.x) * m.n.y - (b.y - m.c.y) * m.n.x);
    if (s > 0 && along < hyp(m.p1.x - m.p2.x, m.p1.y - m.p2.y) / 2 + R) {
      b.potted = k; b.state = "still"; b.vx = b.vy = 0;
      b.events.push({ t, type: "pocket", pocket: k, x: b.x, y: b.y });
      return;
    }
  }
  // safety: anything that escaped the table (should not happen) is treated as off the table
  if (b.x < -6 || b.x > P.W + 6 || b.y < -6 || b.y > P.L + 6) { b.potted = "off"; b.state = "still"; b.vx = b.vy = 0; }
}

/* Run a shot to rest. balls: [{id, x, y}], cue = index of the struck ball.
 * Returns balls with paths (sampled every `sample` s) and events. */
function simulate(spec, params) {
  const P = Object.assign({}, DEFAULTS, params || {});
  const geo = geometry(P);
  const balls = spec.balls.map(b => makeBall(b.id, b));
  Object.defineProperty(P, "_balls", { value: balls, enumerable: false });
  strike(balls[spec.cue || 0], spec.aim, spec.tip || { x: 0, y: 0 }, spec.speed, P);
  const dt = spec.dt || 4e-4, sample = spec.sample || 1 / 120, tMax = spec.tMax || 30;
  let seed = (spec.seed == null ? 12345 : spec.seed) >>> 0;
  const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let x = seed; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  let t = 0, nextS = sample;
  const N = balls.length, R4 = 4 * R * R;
  while (t < tMax) {
    let moving = false;
    for (const b of balls) { b._t = t; clothStep(b, dt, P); }
    // find touching pairs, then resolve them in random order so that a ball touching two others
    // at once (a racked ball) doesn't always favour the same side
    // Only pairs with a moving ball can touch, so each moving ball is checked against the rest (two moving balls once).
    // The pairs are then put in the same order as checking every pair would give, so the shuffle and the result don't change.
    let hits = null;
    for (let i = 0; i < N; i++) {
      const A = balls[i];
      if (A.potted || A.state === "still") continue;
      for (let j = 0; j < N; j++) {
        if (j === i) continue;
        const B = balls[j];
        if (B.potted || (j < i && B.state !== "still")) continue;   // two moving balls: counted once, from the lower index
        const dx = B.x - A.x, dy = B.y - A.y;
        if (dx * dx + dy * dy < R4) (hits || (hits = [])).push(i < j ? i * N + j : j * N + i);
      }
    }
    if (hits) {
      if (hits.length > 1) hits.sort((a, b) => a - b);
      for (let k = hits.length - 1; k > 0; k--) { const m = Math.floor(rnd() * (k + 1)); const h = hits[k]; hits[k] = hits[m]; hits[m] = h; }
      for (const h of hits) ballBall(balls[Math.floor(h / N)], balls[h % N], P, t);
    }
    for (const b of balls) railStep(b, geo, P, t);
    for (const b of balls) if (b.state !== "still") moving = true;
    t += dt;
    if (t >= nextS || !moving) {
      for (const b of balls) { const last = b.path[b.path.length - 1]; if (last.x !== b.x || last.y !== b.y || !moving) b.path.push({ x: b.x, y: b.y, t }); }
      nextS += sample;
    }
    if (!moving) break;
  }
  for (const b of balls) delete b._t;
  return { balls, t, params: P, geo };
}

const api = { simulate, geometry, speedOf, DEFAULTS, R, G };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.PoolPhysics = api;
})(typeof window !== "undefined" ? window : globalThis);
