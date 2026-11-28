// Drawing the table and balls, touch handling on it, and the pocket zoom sheet.
/* ---------- table drawing ---------- */
const NS = "http://www.w3.org/2000/svg";
let pScene = null;   // Play's kept drawing (play.js)
function staticTable() {
  const { W, L } = settings; const P = pockets();
  let g = `<rect x="${-RAIL}" y="${-RAIL}" width="${W + 2 * RAIL}" height="${L + 2 * RAIL}" rx="2.2" fill="var(--rail)"/>`;
  g += `<rect x="-1.1" y="-1.1" width="${W + 2.2}" height="${L + 2.2}" fill="var(--cushion)"/>`;
  g += `<rect x="0" y="0" width="${W}" height="${L}" fill="var(--cloth)"/>`;
  // grid
  const grid = settings.grid === "8x4" ? [4, 8] : settings.grid === "16x8" ? [8, 16] : null;
  if (grid) {
    const [cols, rows] = grid; let lines = "";
    for (let i = 1; i < cols; i++) { const x = W / cols * i; lines += `<line x1="${x}" y1="0" x2="${x}" y2="${L}"/>`; }
    for (let j = 1; j < rows; j++) { const y = L / rows * j; lines += `<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`; }
    g += `<g stroke="#ffffff" stroke-opacity="${settings.grid === "16x8" ? .14 : .2}" stroke-width="1" vector-effect="non-scaling-stroke">${lines.replace(/\/>/g, ' vector-effect="non-scaling-stroke"/>')}</g>`;
    if (settings.labels) {
      let t = "";
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
        const x = W / cols * (c + .5), y = L - L / rows * (r + .5);
        t += `<text x="${x}" y="${y}">${String.fromCharCode(65 + c)}${r + 1}</text>`;
      }
      g += `<g fill="#ffffff" fill-opacity=".38" font-size="${settings.grid === "16x8" ? 1.5 : 2.4}" font-family="var(--f-mono)" text-anchor="middle" dominant-baseline="central">${t}</g>`;
    }
  }
  // head string and spots (head end is at the bottom of the screen)
  g += `<line x1="0" y1="${L * .75}" x2="${W}" y2="${L * .75}" stroke="#ffffff" stroke-opacity=".28" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>`;
  g += `<circle cx="${W / 2}" cy="${L * .25}" r=".35" fill="#ffffff" fill-opacity=".55"/><circle cx="${W / 2}" cy="${L * .75}" r=".35" fill="#ffffff" fill-opacity=".55"/>`;
  // pockets
  for (const k in P) g += pocketSvg(P[k], k[0] === "S");
  // diamonds
  const off = RAIL * .55 + .6; let d = "";
  for (let k = 1; k < 8; k++) { if (k === 4) continue; const y = L / 8 * k; d += `<circle cx="${-off}" cy="${y}" r=".42"/><circle cx="${W + off}" cy="${y}" r=".42"/>`; }
  for (let k = 1; k < 4; k++) { const x = W / 4 * k; d += `<circle cx="${x}" cy="${-off}" r=".42"/><circle cx="${x}" cy="${L + off}" r=".42"/>`; }
  g += `<g fill="var(--diamond)">${d}</g>`;
  g += `<text x="${W * .375}" y="${L + RAIL - .9}" font-size="1.9" fill="var(--diamond)" fill-opacity=".7" text-anchor="middle" font-family="var(--f-body)" letter-spacing=".3">HEAD</text>`;
  g += `<text x="${W * .375}" y="${-RAIL + 2.4}" font-size="1.9" fill="var(--diamond)" fill-opacity=".7" text-anchor="middle" font-family="var(--f-body)" letter-spacing=".3">FOOT</text>`;
  return g;
}
/* A pocket: the jaws angle in from the cushion noses, then a deep oval back.
   Drawn in table inches; the cut reaches about one ball width behind the mouth. */
/* Cloth between the mouth line and a curve that follows the front of the hole (the user's red-line sketch). */
function clothFill(pk, out, side) {
  /* The curve meets each jaw edge where the hole does, and sits half that deep in the middle. */
  const h = pk.w / 2, rh = pk.w / 2 + .15, ve = (side ? 2.3 : 2.4) - Math.sqrt(rh * rh - h * h), vc = ve / 2;
  const cv = (h * h + ve * ve - vc * vc) / (2 * (ve - vc)), r = cv - vc;
  const t = mul(sub(pk.p2, pk.p1), 1 / len(sub(pk.p2, pk.p1)));
  const at = (u, v) => toSvg(add(pk.c, add(mul(t, u), mul(out, v))));
  const pts = [at(-h, 0)];
  for (let i = 0; i <= 24; i++) { const u = -h + 2 * h * i / 24; pts.push(at(u, cv - Math.sqrt(r * r - u * u))); }
  pts.push(at(h, 0));
  return pts.map(p => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(" ");
}
/* Pocket as drawn in the first version: a dark channel behind the mouth and a round hole. */
function pocketSvg(pk, side) {
  const out = mul(pk.n, -1);
  const a = toSvg(pk.p1), b = toSvg(pk.p2), a2 = toSvg(add(pk.p1, mul(out, 3))), b2 = toSvg(add(pk.p2, mul(out, 3)));
  const hc = toSvg(add(pk.c, mul(out, side ? 2.3 : 2.4)));
  return `<polygon points="${a.x},${a.y} ${b.x},${b.y} ${b2.x},${b2.y} ${a2.x},${a2.y}" fill="var(--pocket)"/>` +
    `<circle cx="${hc.x}" cy="${hc.y}" r="${pk.w / 2 + .15}" fill="var(--pocket)"/>` +
    `<polygon points="${clothFill(pk, out, side)}" fill="var(--cloth)"/>` +
    `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#ffffff" stroke-opacity=".3" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
}
function ballSvg(p, kind, active) {
  const q = toSvg(p); let s = "";
  if (active) s += `<circle cx="${q.x}" cy="${q.y}" r="${R_BALL + .9}" fill="none" stroke="#ffffff" stroke-opacity=".9" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
  if (kind === "cb") s += `<circle cx="${q.x}" cy="${q.y}" r="${R_BALL}" fill="#fbfaf4" fill-opacity=".6" stroke="#1b1b1b" stroke-dasharray="3 2" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`;
  if (kind === "ob") s += `<circle cx="${q.x}" cy="${q.y}" r="${R_BALL}" fill="#f2b705" stroke="#5c4300" stroke-width="1.5" vector-effect="non-scaling-stroke"/><circle cx="${q.x}" cy="${q.y}" r=".5" fill="#fffdf4"/><text x="${q.x}" y="${q.y + .02}" font-size=".72" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="#1b1b1b" font-family="var(--f-body)">1</text>`;
  if (kind === "target") s += `<circle cx="${q.x}" cy="${q.y}" r="${R_BALL}" fill="none" stroke="var(--marker)" stroke-width="2" stroke-dasharray="3 2" vector-effect="non-scaling-stroke"/><path d="M${q.x - 1.8} ${q.y}h3.6M${q.x} ${q.y - 1.8}v3.6" stroke="var(--marker)" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`;
  if (kind === "result") s += `<circle cx="${q.x}" cy="${q.y}" r="${R_BALL}" fill="#fbfaf4" stroke="#111111" stroke-width="2" vector-effect="non-scaling-stroke"/><circle cx="${q.x}" cy="${q.y}" r=".18" fill="#c23b2e"/>`;
  return s;
}
function line(a, b, color, dash, op = .7) {
  const p = toSvg(a), q = toSvg(b);
  return `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="${color}" stroke-opacity="${op}" stroke-width="1.3" ${dash ? `stroke-dasharray="${dash}"` : ""} vector-effect="non-scaling-stroke"/>`;
}
const BALL_COL = { 1: "#f2c300", 2: "#1f4fbf", 3: "#d0302a", 4: "#6a2c91", 5: "#ef7d1a", 6: "#1d8a4a", 7: "#7a1f1f", 8: "#151515", 9: "#f2c300", 10: "#1f4fbf", 11: "#d0302a", 12: "#6a2c91", 13: "#ef7d1a", 14: "#1d8a4a", 15: "#7a1f1f" };
/* The rack with the 1 on the foot spot: 8-ball triangle (8 in the middle of the third row, a solid and a stripe in the back corners),
   9-ball diamond (9 in the middle) or 10-ball triangle (10 in the middle of the third row) */
function rackBalls(kind) {
  const rows = kind === "10" ? [1, 2, 3, 4] : kind === "8" ? [1, 2, 3, 4, 5] : [1, 2, 3, 2, 1], mid = kind === "10" ? 10 : kind === "8" ? 8 : 9, d = 2 * R_BALL, out = [];
  const rest = kind === "10" ? [2, 3, 4, 5, 6, 7, 8, 9] : kind === "8" ? [9, 2, 10, 11, 3, 12, 4, 13, 6, 14, 5, 7, 15] : [2, 3, 4, 5, 6, 7, 8];
  rows.forEach((n, r) => { for (let i = 0; i < n; i++) {
    const num = r === 0 ? 1 : (r === 2 && i === 1) ? mid : rest.shift();
    out.push({ n: num, x: settings.W / 2 + (i - (n - 1) / 2) * d, y: settings.L * .75 + r * d * Math.sqrt(3) / 2 });
  } });
  return out;
}
function numBall(p, n) {
  const q = toSvg(p), stripe = n > 8;
  return (stripe ? `<circle cx="${q.x}" cy="${q.y}" r="${R_BALL}" fill="#fbfaf4" stroke="#1b1b1b" stroke-opacity=".5" stroke-width="1" vector-effect="non-scaling-stroke"/><rect x="${q.x - R_BALL * .98}" y="${q.y - R_BALL * .55}" width="${R_BALL * 1.96}" height="${R_BALL * 1.1}" fill="${BALL_COL[n]}"/>`
    : `<circle cx="${q.x}" cy="${q.y}" r="${R_BALL}" fill="${BALL_COL[n]}" stroke="#1b1b1b" stroke-opacity=".5" stroke-width="1" vector-effect="non-scaling-stroke"/>`) +
    `<circle cx="${q.x}" cy="${q.y}" r=".5" fill="#fffdf4"/><text x="${q.x}" y="${q.y + .02}" font-size="${n > 9 ? .55 : .7}" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="#1b1b1b" font-family="var(--f-body)">${n}</text>`;
}
/* Break box: head string to head rail, between the outer head-rail diamonds */
function breakBoxSvg() {
  const a = toSvg({ x: settings.W / 4, y: settings.L / 4 });
  return `<rect x="${a.x}" y="${a.y}" width="${settings.W / 2}" height="${settings.L / 4}" fill="#ffffff" fill-opacity=".06" stroke="#ffffff" stroke-opacity=".75" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`;
}
/* where the 1-ball reached the side rail: + is long (past the pocket, toward the head rail) */
const railPoint = (pocket, v) => ({ x: pocket === "SL" ? R_BALL : settings.W - R_BALL, y: settings.L / 2 - v });
function sectionLinesSvg() {
  let g = "";
  for (const f of [3 / 8, 5 / 8]) { const a = toSvg({ x: 0, y: settings.L * f }), b = toSvg({ x: settings.W, y: settings.L * f }); g += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#ffffff" stroke-opacity=".55" stroke-width="1.5" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/>`; }
  for (const [f, t] of [[13 / 16, "UPPER"], [1 / 2, "CENTRE"], [3 / 16, "LOWER"]]) { const q = toSvg({ x: settings.W - 1.2, y: settings.L * f + (f === .5 ? 4.5 : 0) }); g += `<text x="${q.x}" y="${q.y}" font-size="1.5" fill="#ffffff" fill-opacity=".5" text-anchor="end" dominant-baseline="central" font-family="var(--f-body)" letter-spacing=".2" transform="${land ? `rotate(-90 ${q.x} ${q.y})` : ""}">${t}</text>`; }
  return g;
}
function dynBreak() {
  const P = pockets(), pk = P[S.pocket]; let g = sectionLinesSvg() + breakBoxSvg();
  const pc = toSvg(pk.c);
  g += `<circle cx="${pc.x}" cy="${pc.y}" r="${pk.w / 2 + 1}" fill="none" stroke="var(--marker)" stroke-width="2.5" vector-effect="non-scaling-stroke"/>`;
  const rack = rackBalls(S.rack);
  schedulePrediction();
  g += predSvg();
  if (S.cb) g += line(S.cb, rack[0], "#ffffff", "2 3", .45);
  for (const b of rack) g += numBall(b, b.n);
  if (S.rail != null) { const q = toSvg(railPoint(S.pocket, S.rail)); g += `<circle cx="${q.x}" cy="${q.y}" r="${R_BALL}" fill="#f2c300" fill-opacity=".9" stroke="#1b1b1b" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`; }
  if (S.cb) g += ballSvg(S.cb, "cb", S.tool === "cb");
  if (S.result && !S.scratch) g += ballSvg(S.result, "result", S.tool === "result");
  return g;
}
function dynTable() {
  if (simMode()) return dynSim();
  if (brkMode()) return dynBreak();
  const P = pockets(); const pk = P[S.pocket]; let g = "";
  // target pocket ring
  const pc = toSvg(pk.c);
  if (!zoomOpen && S.ob) g += `<circle cx="${pc.x}" cy="${pc.y}" r="${pk.w / 2 + 1}" fill="none" stroke="var(--marker)" stroke-width="2.5" vector-effect="non-scaling-stroke"/>`;
  if (S.ob) {
    g += line(S.ob, pk.c, "#ffffff", "4 3", .55);
    if (S.cb) {
      const u = unit(sub(pk.c, S.ob)); const ghost = sub(S.ob, mul(u, 2 * R_BALL)); const gq = toSvg(ghost);
      g += line(S.cb, ghost, "#ffffff", "2 3", .45);
      g += `<circle cx="${gq.x}" cy="${gq.y}" r="${R_BALL}" fill="none" stroke="#ffffff" stroke-opacity=".4" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
    }
  }
  if (S.target && S.result) g += line(S.target, S.result, "var(--marker)", "", .95);
  if (S.cb) g += ballSvg(S.cb, "cb", S.tool === "cb");
  if (S.ob) g += ballSvg(S.ob, "ob", S.tool === "ob");
  if (S.target) g += zoneSvg(zoneShape(S.target, S.tz), .16) + ballSvg(S.target, "target", S.tool === "target");
  if (S.result) g += ballSvg(S.result, "result", S.tool === "result");
  if (S.entry) { const e = toSvg(S.entry); g += `<circle cx="${e.x}" cy="${e.y}" r=".45" fill="#f2b705" stroke="#1b1b1b" stroke-width="1" vector-effect="non-scaling-stroke"/>`; }
  return g;
}
let land = false;
const LAND_MQ = window.matchMedia ? window.matchMedia("(orientation: landscape) and (min-width: 560px)") : null;
function viewBox() {
  const a = settings.W + 2 * RAIL, b = settings.L + 2 * RAIL;
  return land ? `${-RAIL} ${-RAIL} ${b} ${a}` : `${-RAIL} ${-RAIL} ${a} ${b}`;
}
function aspect() { const a = settings.W + 2 * RAIL, b = settings.L + 2 * RAIL; return land ? `${b} / ${a}` : `${a} / ${b}`; }
/* landscape turns the table a quarter turn clockwise: head end on the left */
function rotAttr() { return land ? `translate(${settings.L},0) rotate(90)` : ""; }
function disp(q) { return land ? { x: settings.L - q.y, y: q.x } : q; }
function buildTable() {
  const svg = $("tbl");
  svg.setAttribute("viewBox", viewBox());
  svg.style.aspectRatio = aspect();
  svg.innerHTML = `<g transform="${rotAttr()}"><g id="tblContent"><g id="tStatic">${staticTable()}</g><g id="tDyn"></g></g></g>`;
  $("loupeRot").setAttribute("transform", rotAttr());
  renderTable();
}
/* Play keeps its drawing between frames (see drawPlay); the other modes are drawn from markup, and the page is only
   touched when the markup changes */
function renderTable() {
  const d = $("tDyn"); if (!d) return;
  if (playMode()) return drawPlay();
  pScene = null; const h = dynTable();
  if (d._h !== h) { d._h = h; d.innerHTML = h; }
}

/* ---------- pointer handling on the table ---------- */
function svgPt(svg, e, el) {
  const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  const m = (el || svg).getScreenCTM(); if (!m) return null;
  const q = pt.matrixTransform(m.inverse());
  return { x: q.x, y: settings.L - q.y, sx: q.x, sy: q.y };
}
let drag = null;
/* in break mode the cue ball starts behind the head string */
function placeFor(p) {
  const q = clampBall(p); if (brkShape() && S.tool === "cb") q.y = Math.min(q.y, settings.L / 4);
  if (simMode() && (S.tool === "cb" || S.tool === "ob")) {      // keep the two balls from overlapping
    const o = S.tool === "cb" ? S.ob : S.cb;
    if (o) { const d = sub(q, o), l = len(d); if (l < 2 * R_BALL + .05) { const k = (2 * R_BALL + .05) / (l || 1); return clampBall(add(o, mul(d, k))); } }
  }
  return q;
}
function onTableDown(e) {
  if (playMode()) return playDown(e);
  const svg = $("tbl"); const p = svgPt(svg, e, $("tblContent")); if (!p) return;
  if (simMode()) {
    simStopAnim();
    if (!simBrk()) {   // grab whichever ball or marker is under the finger
      const near = [["cb", S.cb, 3.5], ["ob", S.ob, 3.5], ["target", S.target, 3.5]].filter(([, b, r]) => b && len(sub(b, p)) < r).sort((a, b) => len(sub(a[1], p)) - len(sub(b[1], p)));
      if (near.length && S.tool !== near[0][0]) { S.tool = near[0][0]; renderTools(); }
    }
  }
  // pocket tap: near a mouth, or anywhere off the cloth near a pocket
  const P = pockets(); let best = null, bd = 1e9;
  for (const k in P) { const d = len(sub(p, P[k].c)); if (d < bd) { bd = d; best = k; } }
  const offCloth = p.x < 0 || p.y < 0 || p.x > settings.W || p.y > settings.L;
  const marker = S.tool === "result" || S.tool === "target";      // a cue ball can stop right by a pocket
  if ((offCloth && bd < 7) || (bd < 2.6 && !marker)) {
    if (simBrk() || (brkMode() && best[0] !== "S")) { if (offCloth) return; }
    else if (simMode() && !S.ob) { if (offCloth) return; }
    else { S.pocket = best; S.entry = null; if (brkMode()) S.rail = null; if (simMode() && simHitWasPot) S.hit = ghostHit() || 0; saveWork(); renderLog(); toast(POCKET_NAMES[best] + " pocket"); return; }
  }
  if (offCloth) return;
  e.preventDefault();
  svg.setPointerCapture(e.pointerId);
  drag = { id: e.pointerId };
  S[S.tool] = placeFor(p);
  if (simMode() && simHitWasPot && S.tool !== "target") S.hit = ghostHit() || 0;
  if (brkMode() && S.tool === "result") { S.scratch = false; S.cbSec = null; }
  if (S.tool === "ob" || S.tool === "cb") S.entry = null;
  showLoupe(p, e);
  renderTable(); renderTools();
}
function onTableMove(e) {
  if (playMode()) return playMove(e);
  if (!drag || e.pointerId !== drag.id) return;
  const p = svgPt($("tbl"), e, $("tblContent")); if (!p) return;
  S[S.tool] = placeFor(p);
  if (simMode() && simHitWasPot && S.tool !== "target") { S.hit = ghostHit() || 0; renderHit(); }
  showLoupe(p, e);
  renderTable(); if (simMode()) renderSimRes();
}
function onTableUp(e) {
  if (playMode()) return playUp(e);
  if (!drag || e.pointerId !== drag.id) return;
  drag = null; hideLoupe(); saveWork(); renderLog();
}
/* wrapBox: the table area's box, when the caller already has it (Play measures it once per drag, so a move never forces a layout) */
function showLoupe(p, e, at, wrapBox) {
  const l = $("loupe"), wrap = wrapBox || $("tablewrap").getBoundingClientRect();
  const q = disp(toSvg(at || (playMode() ? p : S[S.tool] || p))); const half = 6;
  const sv = $("loupeSvg"); sv.setAttribute("viewBox", `${q.x - half} ${q.y - half} ${half * 2} ${half * 2}`);
  $("loupeX").innerHTML = `<path d="M${q.x - 2.4} ${q.y}h1.6M${q.x + .8} ${q.y}h1.6M${q.x} ${q.y - 2.4}v1.6M${q.x} ${q.y + .8}v1.6" stroke="#ff4d3d" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`;
  const leftSide = e.clientX - wrap.left > wrap.width / 2;
  l.style.left = leftSide ? "6px" : "auto"; l.style.right = leftSide ? "auto" : "6px";
  l.style.top = (e.clientY - wrap.top < 160) ? (wrap.height - 140) + "px" : "6px";
  /* the magnifier copies the table only while it shows: a copy is rebuilt whenever the table changes */
  if (l.hidden) for (const u of $("loupeRot").querySelectorAll("use")) u.setAttribute("href", u.dataset.href);
  l.hidden = false;
}
function hideLoupe() {
  const l = $("loupe"); if (l.hidden) return;
  l.hidden = true; for (const u of $("loupeRot").querySelectorAll("use")) u.removeAttribute("href");
}

/* ---------- pocket zoom ---------- */
let zDrag = null, zoomOpen = false;
function openZoom() {
  if (!S.ob) { toast("Place the object ball first"); return; }
  $("sheet").hidden = false; zoomOpen = true; renderTable(); renderZoom();
}
function renderZoom() {
  const P = pockets(); const pk = P[S.pocket]; const d = aimDir(pk, S.ob);
  const dsv = { x: d.x, y: -d.y }; const phi = Math.atan2(dsv.y, dsv.x) * 180 / Math.PI; const th = -90 - phi;
  const c = toSvg(pk.c);
  $("zRot").setAttribute("transform", `translate(0,-1.2) rotate(${th}) translate(${-c.x},${-c.y})`);
  const right = { x: d.y, y: -d.x };
  let g = "";
  // aim line through the pocket centre and a ruler across it
  g += line(add(pk.c, mul(d, -6)), add(pk.c, mul(d, 2)), "#ffffff", "4 3", .7);
  const m = isMetric(), step = m ? .5 / 2.54 : .25, n = m ? 14 : 12;     // ticks: 0.5 cm or 1/4 in; labels every 2 cm or 1 in
  for (let k = -n; k <= n; k++) {
    const v = k * step; const base = add(pk.c, mul(right, v)); const big = k % 4 === 0; const lv = m ? k / 2 : k / 4;
    const a = add(base, mul(d, big ? -.55 : -.3)), b = add(base, mul(d, big ? .55 : .3));
    g += line(a, b, "#ffffff", "", big ? .9 : .5);
    if (big && k !== 0) {
      const tp = toSvg(add(base, mul(d, -1.1)));
      g += `<text x="${tp.x}" y="${tp.y}" transform="rotate(${-th} ${tp.x} ${tp.y})" font-size="${m ? .45 : .55}" fill="#ffffff" fill-opacity=".85" text-anchor="middle" dominant-baseline="central" font-family="var(--f-mono)">${lv > 0 ? "+" : ""}${lv}</text>`;
    }
  }
  if (S.entry) {
    const e = toSvg(S.entry);
    g += `<circle cx="${e.x}" cy="${e.y}" r="${R_BALL}" fill="#f2b705" fill-opacity=".92" stroke="#1b1b1b" stroke-width="2" vector-effect="non-scaling-stroke"/><circle cx="${e.x}" cy="${e.y}" r=".08" fill="#1b1b1b"/>`;
  }
  $("zDyn").innerHTML = g;
  const off = pocketOffset(S.entry, pk, S.ob); const ae = aimErrorDeg(off, pk, S.ob);
  $("zRead").innerHTML = S.entry
    ? `Entry <b>${sgn(off, 2)}</b> ${Math.abs(off) < .05 ? "(dead centre)" : off > 0 ? "right of centre" : "left of centre"} · aim error <b>${fmt(ae, 2)}°</b>`
    : `${esc(POCKET_NAMES[S.pocket])} pocket, ${fls(len(sub(pk.c, S.ob)), 0)} from the object ball. Tap where the ball went in.`;
}
/* Keep the dragged object ball where a real ball can be: fully on the cloth (centre at least one ball radius
   inside the cushions), or inside the target pocket's opening (centre at least one radius from each jaw), down to the hole. */
function clampEntry(p) {
  const pk = pockets()[S.pocket], side = S.pocket[0] === "S", h = pk.w / 2;
  const t = unit(sub(pk.p2, pk.p1)), out = mul(pk.n, -1);
  const d = sub(p, pk.c), u = dot(d, t), v = dot(d, out);
  const uMax = Math.max(0, h - R_BALL), vMax = side ? 2.3 : 2.4;
  const inChan = Math.abs(u) <= uMax && v <= vMax && v >= -6;
  const W = settings.W, L = settings.L;
  const inCloth = p.x >= R_BALL && p.x <= W - R_BALL && p.y >= R_BALL && p.y <= L - R_BALL;
  if (inChan || inCloth) return p;
  const a = clampBall(p);
  const cu = Math.max(-uMax, Math.min(uMax, u)), cv = Math.max(-6, Math.min(vMax, v));
  const b = add(pk.c, add(mul(t, cu), mul(out, cv)));
  return len(sub(a, p)) <= len(sub(b, p)) ? a : b;
}
function closeZoom() { $("sheet").hidden = true; zoomOpen = false; renderTable(); }
/* The finger is held inside the zoom window (inset by one ball radius), so the whole ball always stays visible. */
/* true when a ball centred at table point q is fully inside the zoom window */
function ballInZoom(q) {
  const z = $("zoom"), u = $("zRot").querySelector("use"), mu = u.getScreenCTM(), m = z.getScreenCTM(); if (!mu || !m) return true;
  const sv = toSvg(q), pt = z.createSVGPoint(); pt.x = sv.x; pt.y = sv.y; const s = pt.matrixTransform(mu);
  const vb = z.viewBox.baseVal, k = Math.hypot(m.a, m.b) * R_BALL - .5;
  return s.x >= m.a * vb.x + m.e + k && s.x <= m.a * (vb.x + vb.width) + m.e - k && s.y >= m.d * vb.y + m.f + k && s.y <= m.d * (vb.y + vb.height) + m.f - k;
}
function setEntry(p) {
  const q = clampEntry(p);
  if (!ballInZoom(q)) { if (S.entry) return; }      // the rail limit would push it out of the window: stay where it was
  S.entry = q; renderZoom();
}
function zoomPoint(e) {
  const z = $("zoom"), m = z.getScreenCTM(); if (!m) return null;
  const vb = z.viewBox.baseVal, k = Math.hypot(m.a, m.b) * R_BALL;
  const x0 = m.a * vb.x + m.e + k, x1 = m.a * (vb.x + vb.width) + m.e - k, y0 = m.d * vb.y + m.f + k, y1 = m.d * (vb.y + vb.height) + m.f - k;
  const ev = { clientX: Math.min(x1, Math.max(x0, e.clientX)), clientY: Math.min(y1, Math.max(y0, e.clientY)) };
  return svgPt(z, ev, $("zRot").querySelector("use"));
}
