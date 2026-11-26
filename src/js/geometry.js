// Table geometry: pockets, target zones, sessions, grid zones, cut angle, pocket offset and aim error.
/* ---------- table geometry ---------- */
function pockets() {
  const { W, L, wc, ws } = settings; const a = wc / Math.SQRT2; const s2 = Math.SQRT1_2;
  const P = {
    HL: { p1: { x: a, y: 0 }, p2: { x: 0, y: a }, n: { x: s2, y: s2 }, corner: { x: 0, y: 0 }, w: wc },
    HR: { p1: { x: W - a, y: 0 }, p2: { x: W, y: a }, n: { x: -s2, y: s2 }, corner: { x: W, y: 0 }, w: wc },
    FL: { p1: { x: 0, y: L - a }, p2: { x: a, y: L }, n: { x: s2, y: -s2 }, corner: { x: 0, y: L }, w: wc },
    FR: { p1: { x: W, y: L - a }, p2: { x: W - a, y: L }, n: { x: -s2, y: -s2 }, corner: { x: W, y: L }, w: wc },
    SL: { p1: { x: 0, y: L / 2 - ws / 2 }, p2: { x: 0, y: L / 2 + ws / 2 }, n: { x: 1, y: 0 }, corner: { x: 0, y: L / 2 }, w: ws },
    SR: { p1: { x: W, y: L / 2 - ws / 2 }, p2: { x: W, y: L / 2 + ws / 2 }, n: { x: -1, y: 0 }, corner: { x: W, y: L / 2 }, w: ws }
  };
  for (const k in P) P[k].c = mul(add(P[k].p1, P[k].p2), .5);
  return P;
}
/* Target zone: null for a point target, else a circle or a diamond-aligned grid cell around the target */
function zoneShape(t, tz) {
  if (!t || !tz || tz === "point") return null;
  if (tz === "c3" || tz === "c6") return { kind: "circle", c: t, r: tz === "c3" ? 3 : 6 };
  const cols = tz === "dia" ? 4 : 8, rows = tz === "dia" ? 8 : 16, cw = settings.W / cols, rh = settings.L / rows;
  const c = Math.min(cols - 1, Math.max(0, Math.floor(t.x / cw))), r = Math.min(rows - 1, Math.max(0, Math.floor(t.y / rh)));
  return { kind: "rect", x0: c * cw, y0: r * rh, x1: (c + 1) * cw, y1: (r + 1) * rh };
}
function inZone(p, z) {
  if (!p || !z) return null;
  if (z.kind === "circle") return len(sub(p, z.c)) <= z.r;
  return p.x >= z.x0 && p.x <= z.x1 && p.y >= z.y0 && p.y <= z.y1;
}
function zoneSvg(z, op) {
  if (!z) return "";
  const st = `fill="var(--marker)" fill-opacity="${op}" stroke="var(--marker)" stroke-opacity=".9" stroke-width="1.5" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"`;
  if (z.kind === "circle") { const q = toSvg(z.c); return `<circle cx="${q.x}" cy="${q.y}" r="${z.r}" ${st}/>`; }
  const a = toSvg({ x: z.x0, y: z.y1 }); return `<rect x="${a.x}" y="${a.y}" width="${z.x1 - z.x0}" height="${z.y1 - z.y0}" ${st}/>`;
}
/* Sessions: shots more than 2 hours apart start a new session */
const sessionOf = s => s.session || ("day-" + String(s.local || s.ts || "").slice(0, 10));
function sessionLabel(ts) {
  try { return new Date(ts).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }); } catch (e) { return String(ts).slice(0, 16); }
}
function sessions(keep) {
  const m = new Map();
  for (const s of shots) { if (keep && !keep(s)) continue; const k = sessionOf(s); const e = m.get(k); if (!e) m.set(k, { id: k, start: s.ts, n: 1 }); else { e.n++; if (s.ts < e.start) e.start = s.ts; } }
  return [...m.values()].sort((a, b) => a.start < b.start ? 1 : -1);
}
function zone(p, cols, rows) {
  if (!p) return "";
  const cw = settings.W / cols, rh = settings.L / rows;
  const c = Math.min(cols - 1, Math.max(0, Math.floor(p.x / cw)));
  const r = Math.min(rows - 1, Math.max(0, Math.floor(p.y / rh)));
  return String.fromCharCode(65 + c) + (r + 1);
}
/* aim direction: object ball start -> pocket mouth centre */
function aimDir(pk, ob) { return ob ? unit(sub(pk.c, ob)) : mul(pk.n, -1); }
function pocketOffset(entry, pk, ob) {
  if (!entry) return null;
  const d = aimDir(pk, ob); const right = { x: d.y, y: -d.x };
  return dot(sub(entry, pk.c), right);       // + = right of centre, seen from the object ball
}
function aimErrorDeg(off, pk, ob) {
  if (off == null || !ob) return null;
  return Math.atan2(off, len(sub(pk.c, ob))) * 180 / Math.PI;
}
function cutAngle(cb, ob, pk) {
  if (!cb || !ob) return null;
  const u = unit(sub(pk.c, ob)); const ghost = sub(ob, mul(u, 2 * R_BALL));
  const v = unit(sub(ghost, cb));
  const ang = Math.acos(Math.max(-1, Math.min(1, dot(v, u)))) * 180 / Math.PI;
  const cross = v.x * u.y - v.y * u.x;       // + = object ball goes left of the cue ball's path
  return cross > 0 ? -ang : ang;              // report + for a cut to the right
}
