// Cues for Play mode: the cue drawn on the table and as a model beside it, and each player's choice of shaft, tip,
// chalk, butt wood, inlay pattern and wrap. Stored with the settings (settings.cues), one look per player.
/* ---------- cue looks ---------- */
/* [key, name, base colour, grain colour, texture] */
const CUE_SHAFTS = [
  ["maple", "Maple", "#ecd3a0", "#c9a66b", "grain"],
  ["laminated", "Low-deflection maple", "#e9cf9a", "#b88f52", "lam"],
  ["ash", "Ash", "#e4d2ad", "#a88a57", "grain"],
  ["carbon", "Carbon fibre", "#1d1f23", "#4a5059", "weave"],
  ["fiberglass", "Fibreglass", "#f1f0ea", "#cfcdc4", "gloss"]
];
const CUE_BUTTS = [
  ["birdseye", "Birdseye maple", "#e6c58b", "#9c7840", "eyes"],
  ["cocobolo", "Cocobolo", "#a5532a", "#5e2a12", "grain"],
  ["ebony", "Ebony", "#1f1b19", "#3d3632", "grain"],
  ["rosewood", "Rosewood", "#5b2a1d", "#2f130b", "grain"],
  ["bocote", "Bocote", "#b98d4d", "#3b2814", "stripe"],
  ["purpleheart", "Purpleheart", "#6a2b58", "#3c1532", "grain"],
  ["carbon", "Carbon fibre", "#212328", "#4a5059", "weave"],
  ["fiberglass", "Fibreglass", "#ecebe4", "#c9c7bd", "gloss"]
];
const CUE_INLAYS = [["plain", "Plain"], ["points", "Points"], ["veneer", "Veneered points"], ["diamonds", "Diamonds"], ["rings", "Rings"]];
const CUE_WRAPS = [["linen", "Irish linen"], ["leather", "Leather"], ["none", "No wrap"]];
/* tips: [key, name, side colour, layer-line colour or ""]; chalk: [key, name, colour or ""]. Looks only: the physics doesn't change */
const CUE_TIPS = [["layered", "Layered leather", "#6e4228", "#3a2214"], ["pressed", "Pressed leather", "#8a5a34", ""], ["pigskin", "Layered pigskin", "#b07b4f", "#6e4228"], ["phenolic", "Phenolic (break)", "#1c1c1e", ""], ["white", "White phenolic", "#f2f0ea", ""]];
const CUE_CHALKS = [["blue", "Blue", "#2f6db5"], ["green", "Green", "#2e8b57"], ["red", "Red", "#b8322e"], ["grey", "Grey", "#8d939b"], ["none", "No chalk", ""]];
const CUE_DEFAULTS = [{ shaft: "maple", butt: "cocobolo", inlay: "points", wrap: "linen", tip: "layered", chalk: "blue" }, { shaft: "carbon", butt: "ebony", inlay: "rings", wrap: "leather", tip: "pressed", chalk: "green" }];
const CUE_PARTS = [["shaft", CUE_SHAFTS, "Shaft"], ["tip", CUE_TIPS, "Tip"], ["chalk", CUE_CHALKS, "Chalk"], ["butt", CUE_BUTTS, "Butt"], ["inlay", CUE_INLAYS, "Inlay"], ["wrap", CUE_WRAPS, "Wrap"]];
const pick = (list, k) => list.find(x => x[0] === k) || list[0];
function cueLook(p) {
  const c = (settings.cues || [])[p] || {}, d = CUE_DEFAULTS[p] || CUE_DEFAULTS[0];
  const o = {}; for (const [part, list] of CUE_PARTS) o[part] = pick(list, c[part] || d[part])[0];
  return o;
}
function setCueLook(p, part, k) {
  const all = (settings.cues || []).slice(); all[p] = Object.assign({}, cueLook(p), { [part]: k }); settings.cues = all; saveSettings();
}
const isDark = hex => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * .299 + ((n >> 8) & 255) * .587 + (n & 255) * .114) < 120; };

/* The cue along +x from the tip (x = 0) to the butt, centred on y = 0, in inches; widths scaled by k so it reads at small sizes.
   shaftLen: tip to joint (a real shaft is 29 in); butt: how much of the butt to draw past the joint (null = all of it);
   bs stretches the butt's pieces (forearm, wrap, sleeve, cap). */
function drawCue(look, shaftLen, butt, k, bs = 1) {
  const sh = pick(CUE_SHAFTS, look.shaft), bt = pick(CUE_BUTTS, look.butt), wrap = look.wrap;
  const dark = isDark(bt[2]), inlay = dark ? "#efe6d2" : "#1c1a18", accent = "#a3242a";
  const segs = [];   // [x0, x1, w0, w1, fill, kind]
  let x = 0; const seg = (l, w0, w1, fill, kind) => { segs.push([x, x + l, w0, w1, fill, kind]); x += l; };
  const tp = pick(CUE_TIPS, look.tip), ch = pick(CUE_CHALKS, look.chalk);
  seg(.5, .62, .62, tp[2], "tip");
  seg(1.2, .64, .66, "#f4f1e8", "ferrule");
  seg(shaftLen - 1.65, .66, .98, sh[2], "shaft");
  seg(.7, 1, 1, "#b9bec4", "joint");
  const j = x;
  seg(11 * bs, 1.02, 1.15, bt[2], "forearm");
  seg(6.2 * bs, 1.15, 1.2, wrap === "linen" ? "#202022" : wrap === "leather" ? "#6b4226" : bt[2], "wrap");
  seg(8.2 * bs, 1.2, 1.28, bt[2], "sleeve");
  seg(.9 * bs, 1.28, 1.3, "#141414", "cap");
  const end = butt == null ? x : j + butt;
  const W = (s, at) => (s[2] + (s[3] - s[2]) * (at - s[0]) / (s[1] - s[0])) * k;   // width of a segment at x
  const P = pts => `<polygon points="${pts.map(([a, b]) => a.toFixed(3) + "," + b.toFixed(3)).join(" ")}"`;
  const line = (x0, y0, x1, y1, col, op, w) => `<line x1="${x0.toFixed(3)}" y1="${y0.toFixed(3)}" x2="${x1.toFixed(3)}" y2="${y1.toFixed(3)}" stroke="${col}" stroke-opacity="${op}" stroke-width="${w || .7}" vector-effect="non-scaling-stroke"/>`;
  let out = "", tex = "";
  for (const s of segs) {
    if (s[0] >= end) break;
    const x0 = s[0], x1 = Math.min(s[1], end), w0 = W(s, x0) / 2, w1 = W(s, x1) / 2;
    out += P([[x0, -w0], [x1, -w1], [x1, w1], [x0, w0]]) + ` fill="${s[4]}" stroke="#1b1b1b" stroke-opacity=".45" stroke-width=".6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
    const mat = s[5] === "shaft" ? sh : (s[5] === "forearm" || s[5] === "sleeve" || (s[5] === "wrap" && wrap === "none")) ? bt : null;
    const along = (f, col, op) => line(x0, -w0 * f, x1, -w1 * f, col, op);
    if (mat) {
      const t = mat[4], g = mat[3];
      if (t === "grain") for (const f of [-.55, -.1, .3, .7]) tex += along(f, g, .35);
      if (t === "lam") for (const f of [-.6, -.2, .2, .6]) tex += along(f, g, .5);
      if (t === "weave") { tex += along(-.35, g, .9); for (let a = x0 + .6; a < x1; a += 1.2) tex += line(a, -W(s, a) / 2 * .8, a + .5, W(s, a) / 2 * .8, g, .35); }
      if (t === "gloss") tex += along(-.45, "#ffffff", .9);
      if (t === "eyes") for (let a = x0 + .7, i = 0; a < x1; a += 1.3, i++) { const y = (i % 3 - 1) * W(s, a) / 2 * .5; tex += `<ellipse cx="${a.toFixed(2)}" cy="${y.toFixed(2)}" rx=".22" ry="${(.09 * k).toFixed(3)}" fill="${g}" fill-opacity=".55"/>`; }
      if (t === "stripe") for (let a = x0 + .5; a < x1; a += .9) tex += line(a, -W(s, a) / 2, a + .35, W(s, a) / 2, g, .5, 1);
    }
    if (s[5] === "wrap" && wrap === "linen") for (let a = x0 + .25; a < x1; a += .5) tex += line(a, -W(s, a) / 2, a + .25, W(s, a) / 2, "#5c5c62", .55);
    if (s[5] === "wrap" && wrap === "leather") tex += along(-.62, "#c9a27a", .7) + along(.62, "#c9a27a", .7);
    if (s[5] === "shaft" && sh[0] !== "carbon") tex += along(-.5, "#ffffff", .25);
    if (s[5] === "tip") {
      if (tp[3]) for (const a of [.17, .3, .43]) tex += line(a, -w0, a, w0, tp[3], .7, .5);
      if (ch[2]) tex += P([[x0, -w0], [x0 + .11, -w0], [x0 + .11, w0], [x0, w0]]) + ` fill="${ch[2]}"/>`;
    }
  }
  /* inlays on the forearm (from the joint) and the sleeve */
  const fa = segs.find(s => s[5] === "forearm"), sl = segs.find(s => s[5] === "sleeve"), wr = segs.find(s => s[5] === "wrap");
  const band = (s, a, l, col) => { if (a >= end) return ""; const b = Math.min(a + l, end); return P([[a, -W(s, a) / 2], [b, -W(s, b) / 2], [b, W(s, b) / 2], [a, W(s, a) / 2]]) + ` fill="${col}"/>`; };
  const point = (inset, col) => { const a = fa[0] + 2.2 + inset * 1.4, b = fa[1] - .05; if (a >= end) return ""; const bb = Math.min(b, end), h = W(fa, bb) / 2 * (1 - inset * .28); const ax = a; return bb < b ? "" : P([[ax, 0], [bb, -h], [bb, h]]) + ` fill="${col}"/>`; };
  let inl = "";
  if (look.inlay === "points") inl += point(0, inlay);
  if (look.inlay === "veneer") inl += point(0, "#f4f1e8") + point(.35, "#1c1a18") + point(.7, accent) + point(1.05, inlay === "#1c1a18" ? "#1c1a18" : "#efe6d2");
  if (look.inlay === "diamonds") { for (const a of [fa[0] + 2.5, fa[0] + 5.5, fa[0] + 8.5, sl[0] + 2.5, sl[0] + 5.5]) if (a < end) { const h = .34 * k; inl += P([[a - .55, 0], [a, -h], [a + .55, 0], [a, h]]) + ` fill="${inlay === "#1c1a18" ? "#1c1a18" : "#f2efe6"}" stroke="${accent}" stroke-width=".5" vector-effect="non-scaling-stroke"/>`; } }
  if (look.inlay === "rings") { for (const [s, a] of [[fa, fa[0] + .2], [fa, fa[0] + 5.2], [fa, fa[0] + 5.6], [fa, fa[1] - .45], [sl, sl[0] + .2], [sl, sl[0] + 4], [sl, sl[0] + 4.4], [sl, sl[1] - .4]]) inl += band(s, a, .18, inlay) + band(s, a + .2, .08, accent); }
  if (look.inlay !== "plain" && wr) { inl += band(fa, fa[1] - .12, .12, inlay); if (wr[1] < end) inl += band(sl, sl[0], .12, inlay); }
  return out + tex + inl;
}

/* ---------- the cue on the table and beside it ---------- */
/* whose cue is in use: the shooter's, or always the first one when you play both sides yourself */
const cuePlayer = () => !S.game || soloPlay() ? 0 : S.game.turn;
/* Behind the cue ball along the aim: the shaft (28.9 in) and the first 22.7 in of the butt. The butt's pieces are drawn 23% long
   (a tenth of the shaft's length moved over to the butt, then the butt made a tenth longer). */
const CUE_SHAFT_TABLE = 28.9, CUE_BUTT_TABLE = 22.7, CUE_SHAFT_MODEL = 28.7, CUE_BUTT_SCALE = 1.23;
/* the cue on the table, in parts: its look (drawn once) and where it lies (changes as you aim) */
function cueStickParts(cb, aim) {
  const g = S.game, q = toSvg(cb), deg = -(aim + Math.PI) * 180 / Math.PI, look = cueLook(g ? cuePlayer() : 0);
  return {
    key: JSON.stringify(look), inner: () => drawCue(look, CUE_SHAFT_TABLE, CUE_BUTT_TABLE, 1, CUE_BUTT_SCALE),
    t: `translate(${q.x.toFixed(3)} ${q.y.toFixed(3)}) rotate(${deg.toFixed(3)}) translate(${(R_BALL + .9).toFixed(2)} 0)`,
  };
}
/* the shooter's whole cue standing upright beside the table (tip at the top); tap it to change it */
function renderCueSide() {
  const el = $("vcue"); el.hidden = !playMode(); if (!playMode()) return;
  const p = cuePlayer();
  const m = $("cueModel"), k = JSON.stringify(cueLook(p));
  if (m._k !== k) { m._k = k; m.innerHTML = `<g transform="rotate(90)">${drawCue(cueLook(p), CUE_SHAFT_MODEL, null, 2, CUE_BUTT_SCALE)}</g>`; }
  $("cueModel").setAttribute("aria-label", soloPlay() ? "Your cue. Tap to change it." : `${playerName(p)}'s cue. Tap to change it.`);
}
let cueFor = 0;
function openCueSheet() { cueFor = cuePlayer(); $("cueSheet").hidden = false; renderCueSheet(); }
function closeCueSheet() { $("cueSheet").hidden = true; renderCueSide(); renderTable(); }
function renderCueSheet() {
  const look = cueLook(cueFor);
  const row = (part, list, title) => `<div class="optrow"><span class="k">${title}</span><div class="chips">${list.map(([k, l, c]) => `<button class="chip sm ${c ? "matl" : ""}" aria-pressed="${look[part] === k}" data-cue="${part}" data-v="${k}">${c ? `<i style="background:${c}"></i>` : ""}${esc(l)}</button>`).join("")}</div></div>`;
  $("cueWho").hidden = soloPlay();
  $("cueWho").innerHTML = [0, 1].map(p => `<button class="chip sm" aria-pressed="${cueFor === p}" data-cuefor="${p}">${esc(playerName(p))}</button>`).join("");
  $("cueFull").innerHTML = drawCue(look, CUE_SHAFT_MODEL, null, 3.2, CUE_BUTT_SCALE);
  $("cueTip").innerHTML = drawCue(look, CUE_SHAFT_MODEL, null, 2.4, CUE_BUTT_SCALE);
  $("cueButt").innerHTML = drawCue(look, CUE_SHAFT_MODEL, null, 2.4, CUE_BUTT_SCALE);
  $("cueOpts").innerHTML = CUE_PARTS.map(([part, list, title]) => row(part, list, title)).join("");
}
