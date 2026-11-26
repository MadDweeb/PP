const P = require("../physics.js");
const R = P.R, deg = a => a * 180 / Math.PI;
function shot({ cb, ob, pocketPt, tip, speed, cutDeg = 0, params }) {
  // aim CB at ghost ball for OB -> pocketPt
  const ux = pocketPt.x - ob.x, uy = pocketPt.y - ob.y, l = Math.hypot(ux, uy);
  const gx = ob.x - ux / l * 2 * R, gy = ob.y - uy / l * 2 * R;
  const aim = Math.atan2(gy - cb.y, gx - cb.x);
  return P.simulate({ balls: [{ id: "cb", ...cb }, ...(ob ? [{ id: "ob", ...ob }] : [])], cue: 0, aim, tip, speed, tMax: 30 }, params);
}
const W = 50, L = 100, FR = { x: W - 1.5, y: L - 1.5 };
const diag = t => ({ x: 50 * t, y: 100 * t });
const fmt = v => v.toFixed(1);
function report(name, r) {
  const [c, o] = r.balls; const hit = c.events.find(e => e.type === "hit");
  const after = hit ? Math.hypot(c.x - hit.x, c.y - hit.y) : null;
  let dir = "";
  if (hit && o) { const oh = o.events.find(e => e.type === "hit"); dir = ` OBdir=${fmt(deg(Math.atan2(oh.vy, oh.vx)))}`; }
  console.log(`${name.padEnd(34)} t=${fmt(r.t)}s CB end (${fmt(c.x)},${fmt(c.y)}) potted=${c.potted} | CB moved after contact ${after == null ? "-" : fmt(after)} in | OB potted=${o ? o.potted : "-"}${dir} | CB events ${c.events.map(e => e.type).join(",")}`);
  return { c, o, hit, after };
}
console.log("Straight in, CB 2 diamonds-ish back, mid speed:");
for (const [n, y] of [["stop (centre)", 0], ["stun-follow", .2], ["follow", .5], ["draw", -.5], ["max draw", -.6]])
  report(n, shot({ cb: diag(.5), ob: diag(.75), pocketPt: FR, tip: { x: 0, y }, speed: .35 }));
console.log("\n30 deg cut, stun at contact (tangent line check): CB departure angle vs OB line");
{
  // place OB, pocket direction straight up the table, CB coming in 30 deg; speed high enough to arrive sliding
  const ob = { x: 25, y: 70 }, pk = { x: 25, y: 99 };
  const gy = 70 - 2 * R; const d = 30;
  const cb = { x: 25 - 25 * Math.sin(d * Math.PI / 180), y: gy - 25 * Math.cos(d * Math.PI / 180) };
  for (const [n, y, s] of [["stun 30° (tip -0.2, firm)", -0.2, .5], ["centre 30° medium", 0, .35], ["follow 30°", .5, .35], ["draw 30°", -.5, .5]]) {
    const r = shot({ cb, ob, pocketPt: pk, tip: { x: 0, y }, speed: s });
    const { c, o, hit } = report(n, r);
    // CB direction right after contact: use path samples just after hit
    const i = c.path.findIndex(p => p.t > hit.t + 0.004), p = c.path[i], q = c.path[i + 1];
    const oh = o.events.find(e => e.type === "hit");
    const angCB = deg(Math.atan2(q.y - p.y, q.x - p.x)), angOB = deg(Math.atan2(oh.vy, oh.vx));
    console.log(`   OB leaves at ${fmt(angOB)}° (90 = straight, throw ${fmt(angOB - 90)}°); CB initial dir ${fmt(angCB)}°, sep ${fmt(Math.abs(angCB - angOB))}°`);
  }
}
console.log("\nLag (no OB) head string to foot and back, by speed:");
for (const s of [.2, .3, .35, .4, .5]) {
  const r = P.simulate({ balls: [{ id: "cb", x: 25, y: 25 }], aim: Math.PI / 2, tip: { x: 0, y: .3 }, speed: s });
  const c = r.balls[0]; console.log(`  speed ${s * 100}% -> stops at y=${fmt(c.y)} after ${c.events.filter(e => e.type === "cushion").length} cushions, ${fmt(r.t)} s`);
}
console.log("\nSide spin off the foot rail (straight up, speed 35%):");
for (const x of [-.5, 0, .5]) {
  const r = P.simulate({ balls: [{ id: "cb", x: 25, y: 50 }], aim: Math.PI / 2, tip: { x, y: 0 }, speed: .35, params: { squirt: 0 } });
  const c = r.balls[0]; const e = c.events.find(e => e.type === "cushion"); const i = c.path.findIndex(p => p.t > e.t + .05);
  const p = c.path[i], q = c.path[i + 3];
  console.log(`  side ${x}: rebound direction ${fmt(deg(Math.atan2(q.y - p.y, q.x - p.x)))}° (straight back = -90), stops (${fmt(c.x)},${fmt(c.y)})`);
}
console.log("\nPotting check: straight shots into each pocket region");
for (const [n, ob, pk] of [["corner FR", diag(.75), FR], ["side SR", { x: 40, y: 50 }, { x: 51, y: 50 }]]) {
  const cb = n === "corner FR" ? diag(.5) : { x: 15, y: 50 };
  const r = shot({ cb, ob, pocketPt: pk, tip: { x: 0, y: 0 }, speed: .35 });
  report(n, r);
}
console.time("perf 200 sims"); for (let i = 0; i < 200; i++) shot({ cb: diag(.3), ob: diag(.6), pocketPt: FR, tip: { x: .3, y: .4 }, speed: .9 }); console.timeEnd("perf 200 sims");
