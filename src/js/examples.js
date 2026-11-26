// Example shots.
/* ---------- examples ---------- */
function exampleShots() {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const P = pockets(); const out = []; const now0 = Date.now();
  const drills = [
    { name: "Example: stun to side rail", vspin: "stun", cb: { x: 25, y: 50 }, ob: { x: 40, y: 82 }, target: { x: 30, y: 70 }, tz: "c6", sdv: 3 },
    { name: "Example: draw back to head", vspin: "draw", cb: { x: 25, y: 60 }, ob: { x: 38, y: 84 }, target: { x: 18, y: 40 }, tz: "dia", sdv: 5 }
  ];
  let k = 0;
  for (const d of drills) for (let i = 0; i < 10; i++) {
    const day = i < 5 ? 1 : 0; const base = now0 - day * 86400e3 - 3600e3; const sesId = "ses-example-" + day;
    const pk = P.FR; const result = clampBall({ x: d.target.x + gauss() * d.sdv, y: d.target.y + gauss() * d.sdv * 1.3 });
    const dir = unit(sub(pk.c, d.ob)); const right = { x: dir.y, y: -dir.x };
    const offv = .15 + gauss() * .7; const entry = add(pk.c, mul(right, offv));
    const outcome = Math.abs(offv) < .85 ? "made" : Math.abs(offv) < 1.25 ? "rattled" : "missed";
    const err = sub(result, d.target); const t = new Date(base + (k++) * 90e3); const z = zoneShape(d.target, d.tz);
    out.push({
      id: uid() + k, ts: t.toISOString(), session: sesId, tz: d.tz, inZone: inZone(result, z) ? 1 : 0, local: t.toISOString().slice(0, 16).replace("T", " "), drill: d.name, shotNo: i + 1,
      vspin: d.vspin, side: "C", speed: 2, speedPct: 38 + Math.round(gauss() * 4), tip: tipFromLabels(d.vspin, "C"), pocket: "FR", cb: d.cb, ob: d.ob, target: d.target,
      result: { x: r2(result.x), y: r2(result.y) }, entry: { x: r2(entry.x), y: r2(entry.y) }, outcome,
      cut: r2(cutAngle(d.cb, d.ob, pk)), obDist: r2(len(sub(pk.c, d.ob))), cbErr: r2(len(err)), cbDx: r2(err.x), cbDy: r2(err.y),
      pocketOff: r2(offv), aimErr: r2(aimErrorDeg(offv, pk, d.ob)), notes: "", example: true,
      table: { W: settings.W, L: settings.L, wc: settings.wc, ws: settings.ws }
    });
  }
  return out;
}
