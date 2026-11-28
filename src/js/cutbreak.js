// Cut break mode: log panel, side rail strip, 1-ball hit picker, physics tuning and the predicted break.
/* ---------- cut break: log panel ---------- */
const railTxt = v => v == null ? "–" : Math.abs(v) < .05 ? "dead centre" : fl(Math.abs(v), 1) + " " + uName() + " " + (v > 0 ? "long" : "short");
const RAIL_W = 340, RAIL_H = 96, RAIL_PAD = 18;
const railX = v => RAIL_PAD + (Math.max(-RAIL_LIM, Math.min(RAIL_LIM, v)) + RAIL_LIM) / (2 * RAIL_LIM) * (RAIL_W - 2 * RAIL_PAD);
function renderBreakPanel() {
  renderTopRow();
  $("brkPocket").innerHTML = [["SL", "Side left"], ["SR", "Side right"]].map(([k, l]) => `<button class="chip sm" aria-pressed="${S.pocket === k}" data-bpk="${k}">${l} pocket</button>`).join("");
  drawRail();
  $("railRead").innerHTML = S.rail == null ? "Not marked. Drag the 1-ball along the rail." :
    `1-ball <b>${railTxt(S.rail)}</b> of the ${POCKET_NAMES[S.pocket].toLowerCase()} pocket centre <button class="btn small" id="railClear">Clear</button>`;
  const cur = S.scratch ? "scratch" : S.result ? sectionOf(S.result) : S.cbSec;
  $("cbSecChips").innerHTML = CB_SECS.map(([k, l]) => `<button class="chip ${k === "scratch" ? "bad" : ""}" aria-pressed="${cur === k}" data-sec="${k}">${l}</button>`).join("");
  $("madeVal").textContent = S.ballsMade == null ? "–" : S.ballsMade;
  renderHit(); renderPredText();
}
/* The side rail as a strip: short (foot side) on the left, long (head side) on the right, the pocket mouth in the middle */
function drawRail() {
  const svg = $("rail"), half = settings.ws / 2, m = isMetric();
  let g = `<rect x="${RAIL_PAD}" y="30" width="${RAIL_W - 2 * RAIL_PAD}" height="16" rx="3" fill="var(--cushion)"/>`;
  g += `<rect x="${railX(-half)}" y="26" width="${railX(half) - railX(-half)}" height="24" fill="var(--pocket)"/>`;
  g += `<rect x="${RAIL_PAD}" y="46" width="${RAIL_W - 2 * RAIL_PAD}" height="${RAIL_H - 66}" fill="var(--cloth)"/>`;
  const step = m ? 2 / 2.54 : 1, n = Math.floor(RAIL_LIM / step);
  for (let k = -n; k <= n; k++) {
    const v = k * step, xi = railX(v), big = m ? k % 5 === 0 : k % 3 === 0;
    g += `<line x1="${xi}" x2="${xi}" y1="${big ? 14 : 19}" y2="26" stroke="var(--muted)" stroke-width="1"/>`;
    if (big) g += `<text x="${xi}" y="11" font-size="12" text-anchor="middle" fill="var(--muted)" font-family="var(--f-mono)">${k === 0 ? 0 : Math.round(toU(Math.abs(v)))}</text>`;
  }
  g += `<text x="${RAIL_PAD}" y="${RAIL_H - 4}" font-size="11" fill="var(--muted)">◀ Short (foot side)</text><text x="${RAIL_W - RAIL_PAD}" y="${RAIL_H - 4}" font-size="11" text-anchor="end" fill="var(--muted)">Long (head side) ▶</text>`;
  g += `<text x="${RAIL_W - 2}" y="26" font-size="12" text-anchor="end" fill="var(--muted)" font-family="var(--f-mono)">${uName()}</text>`;
  const k = (RAIL_W - 2 * RAIL_PAD) / (2 * RAIL_LIM), r = R_BALL * k;
  if (pred && pred.rail != null && pred.key === JSON.stringify(predInputs())) g += `<circle cx="${railX(pred.rail)}" cy="${46 + r}" r="${r}" fill="none" stroke="#f2c300" stroke-width="2" stroke-dasharray="4 3"/>`;
  if (S.rail != null) {
    const cx = railX(S.rail);
    g += `<circle cx="${cx}" cy="${46 + r}" r="${r}" fill="#f2c300" stroke="#1b1b1b" stroke-width="1.5"/><circle cx="${cx}" cy="${46 + r}" r="${r * .45}" fill="#fffdf4"/><text x="${cx}" y="${46 + r + .5}" font-size="${r * .7}" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="#1b1b1b">1</text>`;
  } else g += `<text x="${RAIL_W / 2}" y="${46 + r + 2}" font-size="11" text-anchor="middle" fill="#ffffff" fill-opacity=".85">drag here</text>`;
  svg.setAttribute("viewBox", `0 0 ${RAIL_W} ${RAIL_H}`); svg.innerHTML = g;
  svg.setAttribute("aria-valuetext", S.rail == null ? "not marked" : railTxt(S.rail));
}
let railDrag = null;
function railFromEvent(e) {
  const svg = $("rail"), pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  const m = svg.getScreenCTM(); if (!m) return null; const q = pt.matrixTransform(m.inverse());
  const v = (q.x - RAIL_PAD) / (RAIL_W - 2 * RAIL_PAD) * 2 * RAIL_LIM - RAIL_LIM;
  return Math.round(Math.max(-RAIL_LIM, Math.min(RAIL_LIM, v)) * 10) / 10;
}
function setRail(v) {
  S.rail = v; drawRail();
  $("railRead").innerHTML = `1-ball <b>${railTxt(S.rail)}</b> of the ${POCKET_NAMES[S.pocket].toLowerCase()} pocket centre <button class="btn small" id="railClear">Clear</button>`;
  renderTable();
}
function railEnd(e) {
  if (railDrag !== e.pointerId) return; railDrag = null;
  // a suggestion only: inside the mouth reads as made, outside as missed, unless you already picked one
  if (S.rail != null && !S.outcome) S.outcome = Math.abs(S.rail) <= settings.ws / 2 - R_BALL * .5 ? "made" : "missed";
  saveWork(); renderLog();
}

/* ---------- cut break: 1-ball hit picker ---------- */
const FULL_NAMES = [[1, "Full ball"], [7 / 8, "7/8 ball"], [3 / 4, "3/4 ball"], [5 / 8, "5/8 ball"], [1 / 2, "1/2 ball"], [3 / 8, "3/8 ball"], [1 / 4, "1/4 ball"], [1 / 8, "1/8 ball"]];
function hitName(h) {
  const f = 1 - Math.abs(h); let best = FULL_NAMES[0];
  for (const n of FULL_NAMES) if (Math.abs(n[0] - f) < Math.abs(best[0] - f)) best = n;
  return Math.abs(h) < .03 || best[0] === 1 ? "Full ball" : best[1] + (h > 0 ? ", right side" : ", left side");
}
/* the hit picker sits under the cue ball tip, beside the table */
function renderHit() {
  const h = S.hit || 0, x = h * 2;
  const obj = simMode() && !simBrk();
  $("hitLbl").textContent = "Hit"; $("hitLbl").hidden = !obj;   // the 1-ball speaks for itself
  $("hitPot").hidden = !(obj && S.ob);
  const need = obj && S.ob && S.cb ? ghostHit() : null;
  $("hitPot").title = !obj || !S.ob ? "" : need == null ? `Too thin to pot in the ${POCKET_NAMES[S.pocket].toLowerCase()}` : `To pot in the ${POCKET_NAMES[S.pocket].toLowerCase()}: ${hitName(need).toLowerCase()}`;
  $("hitBall").innerHTML = `<circle r="1" fill="#f2c300" stroke="#5c4300" stroke-width=".04"/>` + (obj ? "" : `<circle r=".45" fill="#fffdf4"/><text y=".03" font-size=".6" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="#1b1b1b" font-family="var(--f-body)">1</text>`) + `
    <circle cx="${x}" r="1" fill="#fbfaf4" fill-opacity=".55" stroke="#1b1b1b" stroke-width=".04" stroke-dasharray=".12 .08"/>
    <line x1="${x}" y1="-1.25" x2="${x}" y2="1.25" stroke="var(--accent)" stroke-width=".04"/>`;
  const nm = hitName(h), cut = nm.indexOf(", ");
  $("hitName").innerHTML = cut < 0 ? `<b>${esc(nm)}</b>` : `<b>${esc(nm.slice(0, cut))}</b><span>${esc(nm.slice(cut + 2))}</span>`;
  $("hitBall").setAttribute("aria-valuetext", nm);
}
function setHit(h, pot) {
  h = Math.max(-.95, Math.min(.95, h)); S.hit = Math.abs(h) < .03 ? 0 : Math.round(h * 100) / 100; simHitWasPot = !!pot;
  renderHit(); if (simMode()) simStopAnim(); renderTable(); if (simMode()) renderSimRes();
}
let hitDrag = null;
function hitFromEvent(e) { const svg = $("hitBall"), pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const m = svg.getScreenCTM(); if (!m) return null; return pt.matrixTransform(m.inverse()).x / 2; }

/* ---------- cut break: predicted 1-ball line ----------
   Runs the break through the physics engine: cue ball from the break spot, aimed at the 1-ball with the chosen hit,
   at the speed bar (100 % = about 24 mph), with your tip point. Defaults are untuned textbook values. */
let pred = null, predKey = "", predT = 0, predLast = 0;
const BREAK_VMAX = 420;
function predInputs() { return [S.cb, S.tip, S.speedPct, S.hit, S.rack, S.pocket, settings.W, settings.L, settings.wc, settings.ws, tuneKey()]; }
function schedulePrediction() {
  if (!brkMode() || !S.cb || !window.PoolPhysics) return;
  const key = JSON.stringify(predInputs());
  if (key === predKey) return;
  predKey = key; clearTimeout(predT);
  /* off the page when it can: the newest setup is the one worked out, and the screen updates when it arrives */
  const j = predJob();
  if (physAsk("pred", j.spec, j.params, r => { pred = predFrom(r); pred.key = key; predLast = performance.now(); if (brkMode()) { renderTable(); renderPredText(); } })) return;
  const wait = Math.max(0, 90 - (performance.now() - predLast));      // at most about 11 updates a second while you drag
  predT = setTimeout(() => { if (JSON.stringify(predInputs()) !== predKey) return; pred = runPrediction(); pred.key = predKey; predLast = performance.now(); renderTable(); renderPredText(); }, wait);
}
/* table tuning: the same knobs and the same saved values ("psim.params") as the Simulator tab */
const TUNE_KEY = "psim.params";
const KNOBS = [
  ["mu_r", "Cloth speed (rolling resistance)", .004, .02, .0005, 4, "Lower = faster cloth. Shows in how far the cue ball and 1-ball roll."],
  ["mu_s", "Sliding friction", .1, .35, .01, 2, "How fast stun and draw wear off. Higher = draw fades sooner."],
  ["e_c", "Cushion bounce", .55, .95, .01, 2, "How lively the rails are."],
  ["mu_c", "Cushion grip", 0, .4, .01, 2, "How much side spin changes the angle off a rail."],
  ["mu_sp", "Side spin fade", .005, .06, .001, 3, "How quickly side spin dies on the cloth."],
  ["e_b", "Ball bounce", .8, 1, .01, 2, "Ball-on-ball restitution. 1.00 is the physical limit (a perfectly elastic ball); real balls are about 0.93 to 0.98."],
  ["pack", "Rack tightness", 0, 1, .05, 2, "How frozen the rack is. Tighter racks send the 1-ball back off the second row more steeply, toward the side pocket. 0 = loose balls."],
  ["vmax", "Top shot speed at 100 %", 180, 400, 5, 0, "Simulator shots, in inches per second (300 ≈ 7.6 m/s)."],
  ["vbreak", "Top break speed at 100 %", 300, 520, 5, 0, "Inches per second at full power (420 ≈ 24 mph)."],
  ["squirt", "Squirt at half-tip side", 0, 4, .1, 1, "Degrees the cue ball pushes off line with side. Low-deflection shafts ≈ 1."]
];
let tune = {};
function loadTune() { const D = (window.PoolPhysics && window.PoolPhysics.DEFAULTS) || {}; tune = Object.assign({}, D, ls.get(TUNE_KEY, {})); }
function saveTune() { const all = Object.assign({}, ls.get(TUNE_KEY, {})); for (const [k] of KNOBS) all[k] = tune[k]; ls.set(TUNE_KEY, all); }
const tuneKey = () => KNOBS.map(([k]) => tune[k]).join(",");
function tuneChanged() { const D = (window.PoolPhysics && window.PoolPhysics.DEFAULTS) || {}; return KNOBS.filter(([k]) => D[k] != null && Math.abs(tune[k] - D[k]) > 1e-9).length; }
function renderKnobs() {
  $("knobs").innerHTML = KNOBS.map(([k, name, lo, hi, step, d, help]) =>
    `<label class="knob" for="k-${k}"><span>${name}</span><b id="kv-${k}">${(+tune[k]).toFixed(d)}</b><input type="range" class="plain" id="k-${k}" data-knob="${k}" min="${lo}" max="${hi}" step="${step}" value="${tune[k]}"><small>${help}</small></label>`).join("");
  renderTuneState();
}
function renderTuneState() { const n = tuneChanged(); $("tuneState").textContent = n ? `${n} changed from the defaults` : "Using the textbook defaults"; }
$("knobs").addEventListener("input", e => {
  const k = e.target.dataset.knob; if (!k) return;
  const d = KNOBS.find(x => x[0] === k)[5]; tune[k] = +e.target.value; $("kv-" + k).textContent = tune[k].toFixed(d);
  saveTune(); renderTuneState(); schedulePrediction(); renderPredText();
  if (simMode()) { simStopAnim(); renderTable(); renderSimRes(); }
});
$("resetKnobs").addEventListener("click", () => { const D = window.PoolPhysics.DEFAULTS; for (const [k] of KNOBS) tune[k] = D[k]; saveTune(); renderKnobs(); schedulePrediction(); renderPredText(); if (simMode()) { renderTable(); renderSimRes(); } });
loadTune(); renderKnobs();
function breakAimAngle(cb, head, h) {
  const d = unit(sub(head, cb)), right = { x: d.y, y: -d.x }, aimPt = add(head, mul(right, h * 2 * R_BALL));
  return Math.atan2(aimPt.y - cb.y, aimPt.x - cb.x);
}
function predJob() {
  const rack = rackBalls(S.rack);
  const balls = [{ id: "cb", x: S.cb.x, y: S.cb.y }].concat(rack.map(b => ({ id: "b" + b.n, x: b.x, y: b.y })));
  return { spec: { balls, cue: 0, aim: breakAimAngle(S.cb, rack[0], S.hit || 0), tip: S.tip, speed: S.speedPct / 100, tMax: 15, sample: 1 / 60, seed: 1 },
    params: Object.assign({}, tune, { W: settings.W, L: settings.L, wc: settings.wc, ws: settings.ws, vmax: tune.vbreak || BREAK_VMAX }) };
}
function runPrediction() { const j = predJob(); return predFrom(window.PoolPhysics.simulate(j.spec, j.params)); }
function predFrom(r) {
  const one = r.balls.find(b => b.id === "b1"), cb = r.balls[0];
  // where the 1-ball first reaches the target side rail, from its cushion and pocket events (path samples can skip a bounce)
  const nearL = p => p.x <= R_BALL + .05, nearR = p => p.x >= settings.W - R_BALL - .05;
  const edge = S.pocket === "SL" ? nearL : nearR, other = S.pocket === "SL" ? nearR : nearL;
  const ev = one.events.filter(e => e.type === "cushion" || e.type === "jaw" || e.type === "pocket");
  const first = ev.find(e => (e.type === "pocket" && e.pocket === S.pocket) || edge(e));
  const drop = one.events.find(e => e.type === "pocket");
  const hitRail = !!first && (!drop || first.t <= drop.t);
  const at = hitRail ? first : null;
  const otherFirst = !hitRail && ev.some(e => other(e) && Math.abs(e.y - settings.L / 2) < settings.L / 4);
  return {
    one: one.path, cbPath: cb.path, oneEnd: one.potted ? null : { x: one.x, y: one.y }, cbEnd: cb.potted ? null : { x: cb.x, y: cb.y },
    rail: hitRail ? r2(settings.L / 2 - at.y) : null, made: one.potted === S.pocket, onePocket: one.potted, scratch: !!cb.potted,
    count: r.balls.slice(1).filter(b => b.potted).length, otherFirst
  };
}
function predSvg() {
  if (!pred || pred.key !== JSON.stringify(predInputs())) return "";
  const path = pts => pts.map((p, i) => { const q = toSvg(p); return (i ? "L" : "M") + q.x.toFixed(2) + " " + q.y.toFixed(2); }).join("");
  let g = `<path d="${path(pred.cbPath)}" fill="none" stroke="#ffffff" stroke-opacity=".45" stroke-width="1.2" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>`;
  g += `<path d="${path(pred.one)}" fill="none" stroke="#f2c300" stroke-opacity=".95" stroke-width="2" stroke-dasharray="5 3" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
  if (pred.oneEnd) { const q = toSvg(pred.oneEnd); g += `<circle cx="${q.x}" cy="${q.y}" r="${R_BALL}" fill="none" stroke="#f2c300" stroke-width="2" vector-effect="non-scaling-stroke"/>`; }
  if (pred.cbEnd) { const q = toSvg(pred.cbEnd); g += `<circle cx="${q.x}" cy="${q.y}" r="${R_BALL}" fill="none" stroke="#ffffff" stroke-opacity=".7" stroke-width="1.5" stroke-dasharray="2 2" vector-effect="non-scaling-stroke"/>`; }
  return g;
}
function renderPredText() {
  const el = $("predRead"); if (!el) return;
  const ok = pred && pred.key === JSON.stringify(predInputs());
  // while a new prediction is being worked out, keep the old text (dimmed) so nothing moves
  if (!ok) { if (!el.innerHTML) el.textContent = "Working it out…"; if (!pred) el.classList.add("stale"); return; }
  el.classList.remove("stale");
  const pn = POCKET_NAMES[S.pocket].toLowerCase();
  const one = pred.made ? `<b>made</b> in the ${pn}` : pred.rail != null ? `${pn} rail, <b>${railTxt(pred.rail)}</b>` : pred.onePocket ? `goes in the ${POCKET_NAMES[pred.onePocket] ? POCKET_NAMES[pred.onePocket].toLowerCase() : "another pocket"}` : pred.otherFirst ? `heads to the <b>other side rail</b>` : `doesn't reach the ${pn} rail`;
  const cb = pred.scratch ? "<b>scratches</b>" : pred.cbEnd ? `finishes <b>${label(CB_SECS, sectionOf(pred.cbEnd)).toLowerCase()}</b>` : "–";
  el.innerHTML = `<span>1-ball: ${one}</span><span>Cue ball: ${cb}</span>`;
  drawRail();
}
