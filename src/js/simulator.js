// The Simulator: live paths, playback and results.
/* ---------- Simulator tab ----------
   Shot: cue ball aimed at the object ball with the chosen hit (or at the target when there is no object ball).
   Break: the rack from the Cut break tab, broken from the break spot. Paths are worked out live while you drag. */
let simRes = null, simKey = "", simT = 0, simLast = 0, simAnim = null, simHitWasPot = false;
/* the hit that sends the object ball straight at the pocket (ghost ball), in the same units as S.hit, or null when too thin */
function ghostHit() {
  if (!S.cb || !S.ob) return null;
  const pk = pockets()[S.pocket]; if (!pk) return null;
  const u = unit(sub(pk.c, S.ob)), ghost = sub(S.ob, mul(u, 2 * R_BALL));
  const v = sub(S.ob, S.cb), d = unit(v), right = { x: d.y, y: -d.x }, a = unit(sub(ghost, S.cb));
  if (a.x * d.x + a.y * d.y <= 0) return null;
  const det = -a.x * right.y + right.x * a.y; if (Math.abs(det) < 1e-9) return 0;
  const h = (a.x * v.y - a.y * v.x) / det / (2 * R_BALL);
  return Math.abs(h) > .95 ? null : Math.round(h * 100) / 100;
}
function simParams() { return Object.assign({}, tune, { W: settings.W, L: settings.L, wc: settings.wc, ws: settings.ws }, simBrk() || playBreakNow() ? { vmax: tune.vbreak || BREAK_VMAX } : {}); }
function simInputs() { return [S.simKind, S.cb, S.ob, S.target, S.pocket, S.tip, S.speedPct, S.hit, S.rack, settings.W, settings.L, settings.wc, settings.ws, tuneKey()]; }
/* one break, racked exactly as drawn */
function simBreakJob(seed) {
  const rack = rackBalls(S.rack);
  const aim = breakAimAngle(S.cb, rack[0], S.hit || 0), speed = Math.max(0, Math.min(1, S.speedPct / 100));
  const spec = { balls: [{ id: "cb", x: S.cb.x, y: S.cb.y }].concat(rack.map(b => ({ id: "b" + b.n, x: b.x, y: b.y }))), cue: 0, aim, tip: S.tip, speed, tMax: 25, sample: 1 / 60, seed };
  const finish = r => { r.balls.forEach((b, i) => { b.n = i ? rack[i - 1].n : 0; }); r.kind = "break"; r.rack = rack; return r; };
  return { spec, params: simParams(), finish };
}
function simBreakRun(seed) { const j = simBreakJob(seed); return j.finish(window.PoolPhysics.simulate(j.spec, j.params)); }
function simRun() {
  if (!S.cb || !window.PoolPhysics) return null;
  if (simBrk()) return simBreakRun(1);
  const balls = [{ id: "cb", x: S.cb.x, y: S.cb.y }]; if (S.ob) balls.push({ id: "ob", x: S.ob.x, y: S.ob.y });
  const aim = S.ob ? breakAimAngle(S.cb, S.ob, S.hit || 0) : S.target ? Math.atan2(S.target.y - S.cb.y, S.target.x - S.cb.x) : Math.PI / 2;
  const r = window.PoolPhysics.simulate({ balls, cue: 0, aim, tip: S.tip, speed: S.speedPct / 100, tMax: 20, sample: 1 / 60, seed: 1 }, simParams());
  r.kind = "shot";
  return r;
}
/* The result for what is on screen now. Shots run every time. A break is worked out off the page when it can be (the
   last one stays on screen until the new one arrives), else here at most about 11 times a second while you drag. */
let simWant = null, simRedraw = 0;
function simLive() {
  const key = JSON.stringify(simInputs()), kind = simBrk() ? "break" : "shot";
  if (key === simKey && simRes) return simRes;
  const keep = () => simRes && simRes.kind === kind ? simRes : null;
  if (kind === "break") {
    if (key === simWant) return keep();
    const j = simBreakJob(1);
    if (physAsk("sim", j.spec, j.params, r => simGot(key, j.finish(r)))) { simWant = key; return keep(); }
  }
  const now = performance.now();
  if (kind === "shot" || !simRes || simRes.kind !== kind || now - simLast > 90) {
    clearTimeout(simT); simRes = simRun(); simKey = key; simLast = performance.now();
  } else {
    clearTimeout(simT); simT = setTimeout(() => { renderTable(); renderSimRes(); }, 95 - (now - simLast));
  }
  return simRes;
}
function simGot(key, r) {
  if (simWant === key) simWant = null;
  simRes = r; simKey = key;
  if (!simRedraw) simRedraw = requestAnimationFrame(() => {
    simRedraw = 0;
    if (!simMode() || playMode() || simAnim || JSON.stringify(simInputs()) !== simKey) return;
    renderTable(); renderSimRes();
  });
}
/* the run for the shot about to be played: exactly what is set up now, never an older one still on screen */
function simNow() {
  const key = JSON.stringify(simInputs());
  if (!(simRes && simKey === key)) { simRes = simRun(); simKey = key; simLast = performance.now(); }
  return simRes;
}
/* stopping a replay early still finishes the shot: a Play shot is then refereed as it would have ended */
function simStopAnim() { if (simAnim) { cancelAnimationFrame(simAnim.id); const done = simAnim.done; simAnim = null; renderQuick(); if (done) done(); else renderTable(); } }
/* stop the playback without finishing the shot: Play's Undo during a shot */
function simCancelAnim() { if (simAnim) { cancelAnimationFrame(simAnim.id); simAnim = null; renderQuick(); renderTable(); } }
function simStop() { simStopAnim(); clearTimeout(simT); }
function simPlay(r, done) {
  simStopAnim();
  const t0 = performance.now(), reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  simAnim = { r, pos: {}, i: {}, id: 0, done };
  const step = now => {
    if (!simAnim) return;
    const t = reduce ? r.t : (now - t0) / 1000;
    for (const b of r.balls) {
      let i = simAnim.i[b.id] || 0; while (i + 1 < b.path.length && b.path[i + 1].t <= t) i++;   // the last point reached; time only goes forward
      simAnim.i[b.id] = i; simAnim.pos[b.id] = b.potted && i >= b.path.length - 1 ? null : b.path[i];
    }
    renderTable();
    if (t < r.t) simAnim.id = requestAnimationFrame(step);
    else { simAnim = null; if (done) done(); else { renderTable(); renderQuick(); } }
  };
  simAnim.id = requestAnimationFrame(step); renderQuick();
}
function simQuick(k) {
  if (k === "paths") { S.simPaths = S.simPaths === false; saveWork(); renderTable(); renderQuick(); return; }
  if (k === "shoot") { if (simAnim) { simStopAnim(); renderTable(); return; } const r = simNow(); if (r) simPlay(r); return; }
}
function setSimKind(k) {
  if (S.simKind === k) return;
  simStop();
  S.simStash = S.simStash || {};
  const keep = {}; for (const key of SIM_KEYS) keep[key] = S[key];
  S.simStash[S.simKind] = JSON.parse(JSON.stringify(keep));
  S.simKind = k;
  Object.assign(S, JSON.parse(JSON.stringify(S.simStash[k] || simStart())));
  if (typeof S.hit !== "number") S.hit = k === "shot" && S.ob ? (ghostHit() || 0) : 0;
  if (k === "play") { const g = ensureGame(); if (g.phase === "break") { S.speedPct = 90; S.tip = { x: 0, y: -.1 }; } else if (g.pct != null) S.speedPct = g.pct; }
  hideCallout();
  S.vspin = vspinOf(S.tip); S.side = sideOf(S.tip); S.speed = speedOf(S.speedPct);
  simHitWasPot = false; saveWork(); renderLog();
}
function loadSimPreset(i) {
  simStop();
  Object.assign(S, simPresetState(i)); S.simPreset = i;
  S.hit = S.ob ? (ghostHit() || 0) : 0; simHitWasPot = !!S.ob;
  S.vspin = vspinOf(S.tip); S.side = sideOf(S.tip); S.speed = speedOf(S.speedPct);
  saveWork(); renderLog();
}
$("simPreset").innerHTML = SIM_PRESETS.map((p, i) => `<option value="${i}">${esc(p.name)}</option>`).join("") + `<option value="-1" hidden>Your own layout</option>`;
$("simPreset").addEventListener("change", e => { const i = +e.target.value; if (i >= 0) loadSimPreset(i); });
/* the row above the table: the starting layout (Shot) or the rack (Cut break, Break, Play) */
function renderTopRow() {
  const bm = brkMode(), sm = simMode(), shot = sm && S.simKind === "shot";
  $("topRow").hidden = !(bm || sm);
  $("simPreset").hidden = !shot; $("rackTop").hidden = shot;
  const cur = playMode() && S.game ? S.game.kind : S.rack;
  $("rackTop").innerHTML = (playMode() ? `<span class="toplbl">Game</span>` : `<span class="toplbl">Rack</span>`) + RACKS.map(([k, l]) => `<button class="chip sm rackchip" aria-pressed="${cur === k}" data-rack="${k}" aria-label="${l}" title="${l}">${rackIcon(k)}</button>`).join("");
}
function renderSimPanel() {
  const b = simBrk();
  for (const [id, k] of [["simKShot", "shot"], ["simKBreak", "break"], ["simKPlay", "play"]]) $(id).setAttribute("aria-selected", S.simKind === k);
  renderTopRow();
  if (playMode()) { renderPlay(); return; }
  if (!b) { const i = S.simPreset || 0, p = SIM_PRESETS[i], same = p && JSON.stringify([p.cb, p.ob, p.target]) === JSON.stringify([S.cb, S.ob, S.target]); $("simPreset").value = same ? i : -1; }
  renderHit(); renderSimRes();
}
const BN_BG = n => n > 8 ? `linear-gradient(#fbfaf4 22%, ${BALL_COL[n]} 22% 78%, #fbfaf4 78%)` : BALL_COL[n];
const bnList = list => list.length ? `<span class="bns">${list.map(b => `<span class="bn" style="background:${BN_BG(b.n)}"><i>${b.n}</i></span>`).join("")}</span>` : "None";
const cellHtml = ([k, v, c, wide]) => `<div class="${wide ? "wide" : ""}"><span class="k">${k}</span><span class="v ${c || ""}">${v}</span></div>`;
function simBreakStats(r) {
  const cb = r.balls[0], obs = r.balls.slice(1), gameN = S.rack === "8" ? 8 : S.rack === "10" ? 10 : 9;
  const made = obs.filter(b => b.potted && b.potted !== "off");
  const railed = obs.filter(b => b.potted || b.events.some(e => e.type === "cushion")).length;
  const one = obs.find(b => b.n === 1);
  return { made, game: made.some(b => b.n === gameN), gameN, scratch: !!cb.potted, legal: railed >= 4 || made.length > 0, railed, cb, one, oneMade: !!(one && one.potted && one.potted !== "off") };
}
function renderSimRes() {
  if (!simMode()) return;
  if (playMode()) return renderPlayInfo();
  const r = simLive(), el = $("simRes");
  if (!r) { el.innerHTML = `<p class="note wide">Place the cue ball to start.</p>`; return; }
  let items;
  if (r.kind === "break") {
    const st = simBreakStats(r), one = st.one;
    items = [
      ["Balls made", bnList(st.made), st.made.length ? "good" : "", true],
      ["1-ball", st.oneMade ? "In the " + POCKET_NAMES[one.potted].toLowerCase() : one ? (one.events.some(e => e.type === "cushion") ? "Hit a rail, stayed up" : "Stayed in the pack") : "–", st.oneMade ? "good" : ""],
      [st.gameN + "-ball", st.game ? "On the break" : "On the table", st.game ? "good" : ""],
      ["Cue ball", st.scratch ? "Scratch" : "Finishes " + label(CB_SECS, sectionOf(st.cb)).toLowerCase(), st.scratch ? "bad" : ""],
      ["Legal break", st.legal ? "Yes" : "No", st.legal ? "good" : "bad"],
      ["Balls to a rail", String(st.railed)],
      ["Time to rest", fmt(r.t, 1) + " s"]
    ];
  } else {
    const [cb, ob] = r.balls; items = [];
    if (ob) {
      const ok = ob.potted === S.pocket;
      items.push(["Object ball", ob.potted ? (ok ? "Made" : ob.potted === "off" ? "Off the table" : "In the " + POCKET_NAMES[ob.potted].toLowerCase()) : "Missed", ok ? "good" : "bad"]);
      const hit = ob.events.find(e => e.type === "hit"), cbh = cb.events.find(e => e.type === "hit");
      let thr = null;
      if (hit && cbh) { const loc = Math.atan2(hit.y - cbh.y, hit.x - cbh.x), dir = Math.atan2(hit.vy, hit.vx); thr = ((dir - loc) * 180 / Math.PI + 540) % 360 - 180; }
      const cut = cutAngle(S.cb, S.ob, pockets()[S.pocket]);
      items.push(["Hit", hitName(S.hit || 0)]);
      items.push(["Cut to the pocket", cut == null ? "–" : Math.abs(cut) >= 89 ? "Impossible" : fmt(Math.abs(cut), 1) + "°", cut != null && Math.abs(cut) >= 89 ? "bad" : ""]);
      items.push(["Throw", thr == null ? "No contact" : fmt(Math.abs(thr), 1) + "°"]);
    }
    if (S.target) { const d = cb.potted ? null : len(sub(cb, S.target)); items.push(["Cue ball", cb.potted ? "Scratch" : fl(d, 1) + " " + uName() + " from target", cb.potted ? "bad" : d <= 3 ? "good" : d <= 6 ? "warn" : ""]); }
    else items.push(["Cue ball", cb.potted ? "Scratch" : "Stops " + zone(cb, 4, 8), cb.potted ? "bad" : ""]);
    const hitE = cb.events.find(e => e.type === "hit");
    if (hitE) items.push(["At contact", cb.events.find(e => e.type === "roll" && e.t < hitE.t) ? "Rolling" : "Still sliding"]);
    items.push(["Cushions (cue ball)", String(cb.events.filter(e => e.type === "cushion").length)]);
    items.push(["Time to rest", fmt(r.t, 1) + " s"]);
  }
  el.innerHTML = items.map(cellHtml).join("");
}
/* A path is sampled 60 times a second, so a long roll has hundreds of points, most on a straight line. Keep only the ones
   that bend it by more than a few hundredths of an inch (Douglas-Peucker): it looks the same and is far cheaper to draw. */
function thinPath(pts, tol = .03) {
  const n = pts.length; if (n < 3) return pts;
  const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1; const st = [[0, n - 1]];
  while (st.length) {
    const [i, j] = st.pop(), a = pts[i], b = pts[j], dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy; let far = -1, fd = tol * tol;
    for (let k = i + 1; k < j; k++) {
      const p = pts[k]; let ex = p.x - a.x, ey = p.y - a.y;
      if (L2 > 0) { const t = Math.max(0, Math.min(1, (ex * dx + ey * dy) / L2)); ex -= t * dx; ey -= t * dy; }
      const d = ex * ex + ey * ey; if (d > fd) { fd = d; far = k; }
    }
    if (far > 0) { keep[far] = 1; st.push([i, far], [far, j]); }
  }
  return pts.filter((_, k) => keep[k]);
}
const pathD = pts => thinPath(pts).map((q, i) => { const v = toSvg(q); return (i ? "L" : "M") + v.x.toFixed(2) + " " + v.y.toFixed(2); }).join("");
function dynSim() {
  const r = simLive(), A = simAnim, paths = S.simPaths !== false; let g = "";
  const dashed = (pts, col, w, op) => `<path d="${pathD(pts)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-opacity="${op}" ${A ? "" : 'stroke-dasharray="5 3"'} stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
  const ring = (p, col, op) => { const q = toSvg(p); return `<circle cx="${q.x}" cy="${q.y}" r="${R_BALL}" fill="none" stroke="${col}" stroke-opacity="${op}" stroke-width="2" vector-effect="non-scaling-stroke"/>`; };
  if (simBrk()) {
    g += breakBoxSvg();
    const rack = rackBalls(S.rack);
    if (r && paths) for (const b of r.balls.slice().reverse()) {
      const pts = A ? b.path.slice(0, (A.i[b.id] || 0) + 1) : b.path;
      g += dashed(pts, b.n ? (b.n > 8 ? BALL_COL[b.n] : BALL_COL[b.n]) : "#ffffff", b.n ? 1.6 : 2.2, b.n ? (b.n === 1 ? .95 : .55) : .9);
    }
    if (A) { for (const b of r.balls.slice(1)) { const q = A.pos[b.id]; if (q) g += numBall(q, b.n); } if (A.pos.cb) g += ballSvg(A.pos.cb, "cb", false); return g; }
    if (S.cb) g += line(S.cb, rack[0], "#ffffff", "2 3", .45);
    for (const b of rack) g += numBall(b, b.n);
    if (r && paths) { const one = r.balls.find(b => b.n === 1), cb = r.balls[0]; if (one && !one.potted) g += ring(one, "#f2c300", .95); if (!cb.potted) g += ring(cb, "#ffffff", .8); }
    if (S.cb) g += ballSvg(S.cb, "cb", true);
    return g;
  }
  const pk = pockets()[S.pocket];
  if (S.ob && pk) {
    const pc = toSvg(pk.c);
    g += `<circle cx="${pc.x}" cy="${pc.y}" r="${pk.w / 2 + 1}" fill="none" stroke="var(--marker)" stroke-width="2.5" vector-effect="non-scaling-stroke"/>`;
    g += line(S.ob, pk.c, "#ffffff", "4 3", .35);
  }
  if (S.target) g += zoneSvg(zoneShape(S.target, "point"), .16) + ballSvg(S.target, "target", S.tool === "target");
  if (r && paths) {
    const [cb, ob] = r.balls;
    if (ob) g += dashed(A ? ob.path.slice(0, (A.i.ob || 0) + 1) : ob.path, "#f2c300", 2, .95);
    g += dashed(A ? cb.path.slice(0, (A.i.cb || 0) + 1) : cb.path, "#ffffff", 2.2, .9);
    if (!A) { if (ob && !ob.potted) g += ring(ob, "#f2c300", .95); if (!cb.potted) g += ring(cb, "#ffffff", .8); }
  }
  if (A) { if (A.pos.ob) g += ballSvg(A.pos.ob, "ob", false); if (A.pos.cb) g += ballSvg(A.pos.cb, "cb", false); return g; }
  if (S.ob) g += ballSvg(S.ob, "ob", S.tool === "ob");
  if (S.cb) g += ballSvg(S.cb, "cb", S.tool === "cb");
  return g;
}
