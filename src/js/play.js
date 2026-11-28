// Play mode (Simulator tab): 8-, 9- and 10-ball for two players on one phone. Aim by dragging on the table; the
// referee is in rules.js. The game lives in S.game, so it survives a reload.
/* ---------- Play mode ---------- */
const PATHS = [["all", "All balls"], ["cue", "Cue ball"], ["ghost", "Ghost ball"], ["none", "No paths"]];
const BREAK_FROM = [["box", "Break box"], ["kitchen", "Behind the head string"]];
let playRes = null, playKey = "", playT = 0, playLast = 0, playGap = 33, playArm = null, playDrag = null, playConfirm = null, playConfirmT = 0;
const soloPlay = () => settings.playSolo === true;
/* Player names from Settings; the referee's messages use them */
function applyPlayerNames() { const n = Array.isArray(settings.playNames) ? settings.playNames : []; PLAYER_NAMES = [0, 1].map(i => String(n[i] || "").trim().slice(0, 16) || "Player " + (i + 1)); }
applyPlayerNames();
/* Solo: one person plays both sides, so the referee's messages drop who is to shoot and keep only what happened. */
function soloText(t) {
  if (!soloPlay() || !t) return t;
  const N = "(?:" + PLAYER_NAMES.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")";
  const rx = (s, f) => new RegExp(s.replace(/N/g, () => N), f || "g");
  t = t.replace(rx("N made (\\d+) on the break and shoots again"), "$1 down on the break")
    .replace(rx("N made the called"), "Made the called").replace(rx(",? and shoots again"), "")
    .replace(rx("N shoots again"), "").replace(rx(":? rack to N"), "")
    .replace(rx("N has ball in hand"), "Ball in hand").replace(rx("N picks who shoots"), "Choose who shoots next")
    .replace(rx("N pushed out"), "Pushed out").replace(rx("N plays the table as it lies"), "Playing the table as it lies")
    .replace(rx("N chooses"), "Choose").replace(rx("N breaks"), "Break").replace(rx("N to shoot with "), "Shoot with ").replace(rx("N to shoot"), "")
    .replace(rx("N has (solids|stripes)"), "$1");
  return t.replace(/\.\s*\./g, ".").replace(/^[\s.]+|[\s.]+$/g, "").replace(/\s{2,}/g, " ");
}
const pathMode = () => PATHS.some(([k]) => k === settings.playPaths) ? settings.playPaths : "all";
const breakFrom = () => settings.playBreak === "kitchen" ? "kitchen" : "box";
const playOpts = () => ({ W: settings.W, L: settings.L });
const playBreakNow = () => playMode() && S.game && S.game.phase === "break";
function playNew(kind, keepScore) {
  const old = S.game, breaker = old && keepScore ? otherP(old.breaker) : 0;
  const g = newRack(kind, breaker, keepScore && old ? old.score : [0, 0], Object.assign(playOpts(), { rackNo: keepScore && old ? old.rackNo : 0 }));
  g.pct = old && old.pct != null ? old.pct : 40; g.log = keepScore && old ? (old.log || []) : [];
  g.last = { text: `${playerName(breaker)} breaks`, fouls: [] };
  S.game = g; S.gameHist = []; playPrep(); S.speedPct = 90; S.speed = speedOf(90); S.tip = { x: 0, y: -.1 }; S.vspin = vspinOf(S.tip); S.side = sideOf(S.tip);
  playArm = null; saveWork();
}
function ensureGame() {
  if (!S.game || !GAME_NAMES[S.game.kind] || !Array.isArray(S.game.balls)) playNew(S.rack || "9", false);
  return S.game;
}
/* where the cue ball may be placed now: the break box or the kitchen at the break, the kitchen after an 8-ball break foul, else anywhere */
function cbRegion(g) {
  const W = settings.W, L = settings.L, r = R_BALL;
  if (g.inHand === "break" && breakFrom() === "box") return { x0: W / 4, x1: W * 3 / 4, y0: r, y1: L / 4 };
  if (g.inHand === "break" || g.inHand === "kitchen") return { x0: r, x1: W - r, y0: r, y1: L / 4 };
  return { x0: r, x1: W - r, y0: r, y1: L - r };
}
/* clamp into the region and push off any ball it would overlap; null when there's no room */
function placeCb(g, p) {
  const a = cbRegion(g), cl = q => ({ x: Math.min(a.x1, Math.max(a.x0, q.x)), y: Math.min(a.y1, Math.max(a.y0, q.y)) });
  let q = cl(p);
  for (let k = 0; k < 12; k++) {
    let moved = false;
    for (const b of g.balls) { const d = sub(q, b), l = len(d); if (l < 2 * R_BALL + .02) { q = cl(add(b, mul(l ? d : { x: 0, y: 1 }, (2 * R_BALL + .03) / (l || 1)))); moved = true; } }
    if (!moved) return q;
  }
  return g.balls.every(b => len(sub(q, b)) >= 2 * R_BALL) ? q : null;
}
function defaultCb(g) {
  const W = settings.W, L = settings.L;
  const want = g.inHand === "break" ? { x: W * .74, y: L * .22 } : g.inHand === "kitchen" ? { x: W / 2, y: L / 8 } : { x: W / 2, y: L / 4 };
  return placeCb(g, want) || placeCb(g, { x: W / 2, y: L / 2 }) || { x: W / 2, y: L / 8 };
}
/* aim at the middle of the nearest ball the shooter may hit first */
function defaultAim(g) {
  if (!g.cb) return Math.PI / 2;
  const ok = legalFirst(g), list = g.balls.filter(b => ok.includes(b.n));
  if (g.phase === "break") { const apex = g.balls.reduce((m, b) => b.y < m.y ? b : m, g.balls[0]); return Math.atan2(apex.y - g.cb.y, apex.x - g.cb.x); }
  const t = (list.length ? list : g.balls).reduce((m, b) => !m || len(sub(b, g.cb)) < len(sub(m, g.cb)) ? b : m, null);
  return t ? Math.atan2(t.y - g.cb.y, t.x - g.cb.x) : Math.PI / 2;
}
/* get the table ready for the next shot: a cue ball to shoot and a starting aim */
function playPrep() {
  const g = S.game; if (!g || g.over) return;
  if (!g.cb) g.cb = defaultCb(g);
  g.aim = defaultAim(g); g.callManual = null; playRes = null;
}
function playSpec(g) {
  return { balls: [{ id: "cb", x: g.cb.x, y: g.cb.y }].concat(g.balls.map(b => ({ id: "b" + b.n, x: b.x, y: b.y }))), cue: 0, aim: g.aim, tip: S.tip, speed: S.speedPct / 100, tMax: 30, sample: 1 / 60, seed: (g.rackNo || 1) * 1000 + g.shots + 1 };
}
function playRun() {
  const g = S.game; if (!g || !g.cb || !window.PoolPhysics || g.over) return null;
  const r = window.PoolPhysics.simulate(playSpec(g), simParams()); r.kind = "play"; return r;
}
/* the prediction for what is on screen: worked out again up to about 30 times a second while you drag, less on a slow phone */
function playLive() {
  const g = S.game; if (!g || !g.cb) return null;
  const key = JSON.stringify([g.cb, g.aim, S.tip, S.speedPct, g.balls, g.phase, settings.W, settings.L, settings.wc, settings.ws, tuneKey()]);
  if (key === playKey && playRes) return playRes;
  const now = performance.now();
  /* a slow phone gets fewer updates rather than a stuck screen: wait at least half again as long as the last one took */
  if (!playRes || now - playLast > playGap) { clearTimeout(playT); playRes = playRun(); playKey = key; const t = performance.now(); playGap = Math.max(33, (t - now) * 1.3); playLast = t; }
  else { clearTimeout(playT); playT = setTimeout(() => { renderTable(); renderPlayInfo(); playLoupe(); }, playGap + 5 - (now - playLast)); }
  return playRes;
}
/* the first ball the cue ball hits in the prediction, and the cue ball's centre at that moment (the ghost ball) */
function playContact(r) {
  if (!r) return null;
  const cb = r.balls[0], hit = cb.events.find(e => e.type === "hit");
  if (!hit) return null;
  const n = +String(hit.other).slice(1), ob = r.balls.find(b => b.id === hit.other);
  const oh = ob && ob.events.find(e => e.type === "hit" && e.other === "cb");
  return { n, ghost: { x: hit.x, y: hit.y }, t: hit.t, ob, dir: oh && oh.vx != null ? unit({ x: oh.vx, y: oh.vy }) : null };
}
/* the call: what you set, or else the ball you're aiming at and the pocket it is heading for */
function playCall() {
  const g = S.game; if (!g || !needsCall(g)) return null;
  if (g.callManual) {
    if (g.callManual.safety) return { safety: true, manual: true };
    const c = Object.assign({}, autoCall() || {}, g.callManual.ball != null ? { ball: g.callManual.ball } : {}, g.callManual.pocket ? { pocket: g.callManual.pocket } : {});
    return c.ball != null && c.pocket ? Object.assign(c, { manual: true }) : null;
  }
  return autoCall();
}
function autoCall() {
  const g = S.game, r = playLive(), c = playContact(r); if (!c || !callable(g).includes(c.n)) return null;
  const P = pockets(), ob = r.balls.find(b => b.id === "b" + c.n);
  if (ob && ob.potted && P[ob.potted]) return { ball: c.n, pocket: ob.potted };
  const from = g.balls.find(b => b.n === c.n); if (!from || !c.dir) return { ball: c.n, pocket: null };
  let best = null, bs = -2;
  for (const k in P) { const s = dot(unit(sub(P[k].c, from)), c.dir); if (s > bs) { bs = s; best = k; } }
  return { ball: c.n, pocket: best };
}
const callText = c => !c ? "no call" : c.safety ? "safety" : c.pocket ? `${c.ball} in the ${POCKET_NAMES[c.pocket].toLowerCase()}` : `the ${c.ball}`;

/* ---------- drawing ---------- */
function cueBallSvg(p, inHand) {
  const q = toSvg(p);
  return (inHand ? `<circle cx="${q.x}" cy="${q.y}" r="${R_BALL + 1}" fill="none" stroke="#ffffff" stroke-opacity=".9" stroke-width="2" stroke-dasharray="3 2" vector-effect="non-scaling-stroke"/>` : "") +
    `<circle cx="${q.x}" cy="${q.y}" r="${R_BALL}" fill="#fbfaf4" stroke="#1b1b1b" stroke-opacity=".55" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
}
function kitchenSvg(g) {
  const a = cbRegion(g); if (g.inHand !== "break" && g.inHand !== "kitchen") return "";
  if (g.inHand === "break" && breakFrom() === "box") return breakBoxSvg();
  const t = toSvg({ x: 0, y: settings.L / 4 });
  return `<rect x="0" y="${t.y}" width="${settings.W}" height="${settings.L / 4}" fill="#ffffff" fill-opacity=".07" stroke="#ffffff" stroke-opacity=".6" stroke-width="1.2" stroke-dasharray="5 3" vector-effect="non-scaling-stroke"/>`;
}
const playCol = n => n ? BALL_COL[n] : "#ffffff";
function dynPlay() {
  const g = ensureGame(), A = simAnim, mode = pathMode(); let s = kitchenSvg(g);
  const dash = (pts, col, w, op) => `<path d="${pathD(pts)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-opacity="${op}" ${A ? "" : 'stroke-dasharray="5 3"'} stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
  const ring = (p, col, op, w) => { const q = toSvg(p); return `<circle cx="${q.x}" cy="${q.y}" r="${R_BALL}" fill="none" stroke="${col}" stroke-opacity="${op}" stroke-width="${w || 2}" vector-effect="non-scaling-stroke"/>`; };
  if (A && A.r.kind === "play") {
    for (const b of A.r.balls.slice().reverse()) {
      if (mode === "none" || mode === "ghost" || (mode === "cue" && b.id !== "cb")) continue;
      const pts = b.path.slice(0, (A.i[b.id] || 0) + 1); if (pts.length > 1) s += dash(pts, playCol(b.id === "cb" ? 0 : +b.id.slice(1)), b.id === "cb" ? 2.2 : 1.6, .7);
    }
    for (const b of A.r.balls) { const q = A.pos[b.id]; if (!q) continue; s += b.id === "cb" ? cueBallSvg(q, false) : numBall(q, +b.id.slice(1)); }
    return s;
  }
  const call = playCall(), P = pockets();
  if (call && call.pocket && P[call.pocket]) { const pk = P[call.pocket], pc = toSvg(pk.c); s += `<circle cx="${pc.x}" cy="${pc.y}" r="${pk.w / 2 + 1}" fill="none" stroke="var(--marker)" stroke-width="2.5" vector-effect="non-scaling-stroke"/>`; }
  const r = g.cb && !g.over && !g.choice ? (g.phase === "break" ? null : playLive()) : null, c = playContact(r);
  if (g.cb && !g.over) {
    // the cue stick behind the ball, along the aim
    s += cueStickSvg(g.cb, g.aim);
    if (g.phase === "break" && mode !== "none") {
      const hit = rayFirst(g.cb, g.aim, g.balls);
      if (hit) s += line(g.cb, hit.ghost, "#ffffff", "4 3", .7) + ring(hit.ghost, "#ffffff", .75, 1.4);
    } else if (r) {
      if (mode === "all") for (const b of r.balls.slice(1)) if (b.path.length > 1) s += dash(b.path, playCol(+b.id.slice(1)), 1.6, .85);
      if (mode === "all" || mode === "cue") s += dash(r.balls[0].path, "#ffffff", 2.2, .9);
      /* the ghost ball: where the cue ball meets the first ball, or else the first rail (or where it stops) */
      const firstStop = () => { const cb = r.balls[0], e = cb.events.find(e => (e.type === "cushion" || e.type === "jaw" || e.type === "pocket") && e.x != null); return e ? { x: e.x, y: e.y, t: e.t } : cb.path[cb.path.length - 1]; };
      const ghost = c ? Object.assign({ t: c.t }, c.ghost) : firstStop();
      /* Ghost ball paths: the cue ball's own route up to the ghost ball, rails and all */
      if (mode === "ghost" && ghost) s += dash(r.balls[0].path.filter(q => q.t == null || ghost.t == null || q.t < ghost.t).concat([ghost]), "#ffffff", 1.6, .8);
      if (ghost && mode !== "none") s += ring(ghost, "#ffffff", .85, 1.4);
      if (mode === "all") { for (const b of r.balls.slice(1)) if (b.path.length > 1 && !b.potted) s += ring(b.path[b.path.length - 1], playCol(+b.id.slice(1)), .9); if (!r.balls[0].potted) s += ring(r.balls[0].path[r.balls[0].path.length - 1], "#ffffff", .8); }
    }
  }
  for (const b of g.balls) s += numBall(b, b.n);
  if (call && call.ball != null) { const b = g.balls.find(x => x.n === call.ball); if (b) s += ring(b, "var(--marker)", .95, 2.2).replace(`r="${R_BALL}"`, `r="${R_BALL + .7}"`); }
  if (g.cb) s += cueBallSvg(g.cb, !!g.inHand && !g.over);
  return s;
}
/* straight-line first contact (used only to show the aim at the break, where paths are hidden) */
function rayFirst(cb, aim, balls) {
  const ux = Math.cos(aim), uy = Math.sin(aim), D = 2 * R_BALL; let best = null;
  for (const b of balls) {
    const px = b.x - cb.x, py = b.y - cb.y, along = px * ux + py * uy; if (along <= 0) continue;
    const off2 = px * px + py * py - along * along; if (off2 >= D * D) continue;
    const t = along - Math.sqrt(D * D - off2); if (!best || t < best.t) best = { t, n: b.n, ghost: { x: cb.x + ux * t, y: cb.y + uy * t } };
  }
  return best;
}

/* ---------- panels: player bar above the table, game card, quick bar ---------- */
/* Above the table: whose turn it is, large and in that player's colour, with the score and Undo.
   Solo: no names or score, only the state of the table. */
const AIM_HINT_SHOTS = 5;
function renderPlayBar() {
  const g = S.game, el = $("playBar"); el.hidden = !playMode(); if (!playMode() || !g) return;
  const solo = soloPlay(), grp = p => g.kind === "8" && g.groups ? GROUP_NAMES[g.groups[p]].toLowerCase() : "";
  const p = g.over ? g.over.winner : g.choice ? g.choice.by : g.turn;
  let head, detail = [];
  if (g.over) head = solo ? "Rack over" : `${esc(playerName(p))} wins the rack`;
  else if (g.choice) head = solo ? "Your choice" : `${esc(playerName(p))} to choose`;
  else if (g.phase === "break") head = solo ? "Break" : `${esc(playerName(p))} to break`;
  else head = solo ? (grp(p) ? "Shooting " + grp(p) : "Your shot") : esc(playerName(p));
  if (!g.over && !g.choice && g.phase !== "break") {
    if (!solo && grp(p)) detail.push(grp(p));
    if (g.inHand) detail.push("ball in hand" + (g.inHand === "kitchen" ? " behind the head string" : ""));
    if (g.kind === "8" && !g.groups) detail.push("open table");
  }
  const two = g.kind !== "8" && !g.over && g.fouls[g.turn] === 2;
  if (two) detail.push("on two fouls");
  const sc = solo ? "" : `<span class="score num" aria-label="Score ${g.score[0]} to ${g.score[1]}">${g.score[0]}<i style="background:var(--accent)"></i>–<i style="background:var(--p2)"></i>${g.score[1]}</span>`;
  const undo = playRolling() || (undoList().length && !simAnim) ? `<button class="btn small" id="undoBtn" data-play="undo">Undo shot</button>` : "";
  const hint = (settings.playShots || 0) < AIM_HINT_SHOTS && !g.over && !g.choice
    ? `<div class="plhint">${g.inHand ? "Drag the cue ball to place it. " : ""}The aim line follows your finger: drag or tap where to aim. ↺ ↻ fine-tune.</div>` : "";
  $("playStatus").innerHTML = `<div class="plturn ${solo ? "solo" : p ? "p2" : "p1"}"><div class="who"><b>${head}</b>${detail.length ? `<span class="${two ? "warn" : ""}">${esc(detail.join(", "))}</span>` : ""}</div>${sc}${undo}</div>${hint}`;
  fitCallout();
}
function renderGameCard() {
  const g = S.game, el = $("gameBody"); if (!g || !playMode()) return;
  let h = "";
  if (needsCall(g) && !g.over && !g.choice) {
    const c = playCall(), balls = callable(g).sort((a, b) => a - b), cm = g.callManual || {};
    h += `<div class="callrow"><div class="calllbl">Your call: <b>${esc(callText(c))}</b>${c && !c.manual ? " <small>(from your aim)</small>" : ""}</div>` +
      `<div class="chips">${balls.map(n => `<button class="chip sm bnchip" aria-pressed="${cm.ball === n}" data-callball="${n}" aria-label="Call the ${n}"><span class="bn" style="background:${BN_BG(n)}"><i>${n}</i></span></button>`).join("")}</div>` +
      `<div class="chips">${Object.keys(POCKET_NAMES).map(k => `<button class="chip sm" aria-pressed="${cm.pocket === k}" data-callpk="${k}">${POCKET_NAMES[k]}</button>`).join("")}</div>` +
      `<div class="chips">${g.kind === "8" ? `<button class="chip sm" aria-pressed="${!!cm.safety}" data-callsafe="1">Safety</button>` : ""}<button class="chip sm" aria-pressed="${!g.callManual}" data-callauto="1">From my aim</button></div>` +
      `<p class="note">Tap a pocket on the table to call it too.</p></div>`;
  }
  h += `<div class="optrow"><span class="k">Players</span><div class="chips"><button class="chip sm" aria-pressed="${!soloPlay()}" data-solo="0">Two players</button><button class="chip sm" aria-pressed="${soloPlay()}" data-solo="1">Solo: I play both sides</button></div>` +
    (soloPlay() ? "" : `<div class="namerow">${[0, 1].map(i => `<input id="pname${i}" style="--p-col:${i ? "var(--p2)" : "var(--accent)"}" value="${esc((settings.playNames || [])[i] || "")}" placeholder="Player ${i + 1}" maxlength="16" autocomplete="off" aria-label="Player ${i + 1} name">`).join("")}</div>`) + `</div>`;
  h += `<div class="optrow"><span class="k">Paths</span><div class="chips">${PATHS.map(([k, l]) => `<button class="chip sm" aria-pressed="${pathMode() === k}" data-paths="${k}">${l}</button>`).join("")}</div></div>`;
  h += `<div class="optrow"><span class="k">Break from</span><div class="chips">${BREAK_FROM.map(([k, l]) => `<button class="chip sm" aria-pressed="${breakFrom() === k}" data-brkfrom="${k}">${l}</button>`).join("")}</div></div>`;
  const log = (g.log || []).slice(-6).reverse();
  if (log.length) h += `<div class="glog"><span class="k">Last shots</span><ol>${log.map(e => `<li class="${e.fouls && e.fouls.length ? "bad" : ""}"><b>Rack ${e.rack}, shot ${e.shot}:</b> ${esc(e.fouls && e.fouls.length ? "Foul. " + e.fouls.join(". ") : soloText(e.text) || "Shot played")}</li>`).join("")}</ol></div>`;
  h += `<div class="tunerow"><span>${esc(GAME_NAMES[g.kind])}, rack ${g.rackNo}</span><button class="btn small" data-play="newgame">${playConfirm === "newgame" ? "Tap again to reset the score" : "New game"}</button></div>`;
  h += `<details class="tunebox"><summary>The rules</summary><ul class="rules">${rulesText(g.kind).map(t => `<li>${esc(t)}</li>`).join("")}</ul></details>`;
  el.innerHTML = h;
  $("gameSub").textContent = `${soloPlay() ? "Solo practice" : "Two players on one phone"}, ${GAME_NAMES[g.kind]}, WPA rules`;
}
function rulesText(k) {
  const common = ["Break from the break box (or behind the head string, set below). Paths are hidden on the break: every rack sits a little differently.",
    "A foul gives your opponent ball in hand anywhere: scratching, the cue ball leaving the table, hitting the wrong ball first, hitting nothing, or no ball reaching a rail after contact when nothing goes in."];
  if (k === "8") return ["Hit any ball on the break. If nothing goes in, four balls must reach a rail or the break is illegal and your opponent chooses: play on, re-rack and break, or have you break again.",
    "The table stays open after the break. The first called ball you make gives you its group, solids or stripes.", "Call every shot (ball and pocket) or call safety. Make the called ball and you keep shooting.",
    "Foul on the break: ball in hand behind the head string. 8 on the break: the breaker spots it or re-breaks.", "You lose if the 8 goes in on a foul, before your group is cleared, in a pocket you didn't call, or off the table."].concat(common.slice(0, 1), [common[1].replace("anywhere", "anywhere (no three-foul rule in 8-ball)")]);
  const top = k === "10" ? 10 : 9;
  return [`Hit the lowest ball first on every shot, the break too. If nothing goes in on the break, four balls must reach a rail or it's a foul.`,
    k === "10" ? "Call every shot (ball and pocket) after the break. A called ball made keeps you at the table; a ball made without the called shot lets your opponent choose who shoots next." : "Any ball made on a legal shot keeps you at the table.",
    k === "10" ? "Make the 10 on a called shot as the last ball to win. A 10 made earlier, on the break or on a foul is spotted." : "Make the 9 on any legal shot to win, the break and combinations too. A 9 made on a foul or a push out is spotted.",
    "Push out (house rule): only on the shot right after a foul-free break, and only if the cue ball has no straight line to the lowest ball. Your opponent then chooses who shoots.",
    "Three fouls in a row lose the rack."].concat(common);
}
function renderPlayQuick(q) {
  const g = S.game;
  if (!g) { q.innerHTML = ""; return; }
  if (simAnim) { q.innerHTML = `<button class="qs plain" data-play="undo">Undo shot<small>put the balls back</small></button><button class="qs plain" data-play="skip">Skip to the end<small>the shot still counts</small></button>`; return; }
  const solo = soloPlay();
  if (g.over) { q.innerHTML = `<button class="qs good" data-play="next">Next rack<small>${solo ? "rack them up" : esc(playerName(otherP(g.breaker))) + " breaks"}</small></button>`; return; }
  if (g.choice) { q.innerHTML = g.choice.options.map(([id, l]) => `<button class="qs plain" data-choice="${id}">${esc(l)}${solo ? "" : `<small>${esc(playerName(g.choice.by))}</small>`}</button>`).join(""); return; }
  const push = pushAvailable(g), armed = playArm === "push" && push, c = playCall();
  q.innerHTML = `<button class="qs fine" data-play="left" aria-label="Turn the aim anticlockwise a little">↺<small>0.1°</small></button>` +
    `<button class="qs good" data-play="shoot">${g.phase === "break" ? "Break" : armed ? "Push out" : "Shoot"}<small>${needsCall(g) && !armed ? "call: " + esc(callText(c)) : solo ? (g.phase === "break" ? "power " + S.speedPct + "%" : "play it") : esc(playerName(g.turn))}</small></button>` +
    `<button class="qs fine" data-play="right" aria-label="Turn the aim clockwise a little">↻<small>0.1°</small></button>` +
    (push ? `<button class="qs ${armed ? "warn" : "plain"} wide" data-play="push" aria-pressed="${armed}">${armed ? "Cancel push out" : "Push out"}<small>no line to the ${lowestBall(g)}: any shot, no fouls but a scratch</small></button>` : "");
}
function renderPlayInfo() {
  renderPlayBar(); renderGameCard(); renderQuick(); renderCueSide();
  /* the quick bar redraws while you aim; the callout announces results instead */
  $("quickbar").setAttribute("aria-live", playMode() ? "off" : "polite");
  const t = $("tbl"); t.tabIndex = playMode() ? 0 : -1;
  t.setAttribute("aria-label", playMode() ? "Pool table. Drag or tap to aim; arrow keys turn the aim, Shift for 1 degree; Enter shoots." : "Pool table. Tap to place balls and markers.");
}
function renderPlay() { ensureGame(); if (S.game.cb == null && !S.game.over) playPrep(); renderPlayInfo(); }

/* ---------- callout over the table: fouls in red, the rest in plain ---------- */
let calloutT = 0;
function showCallout(kind, title, body) {
  title = soloText(title); body = soloText(body);
  if (soloPlay() && kind === "info") return;          // solo: no "next player" messages, only fouls and results
  if (!title) return;
  const el = $("callout"); clearTimeout(calloutT);
  el.className = "callout " + kind; el.innerHTML = `<div class="cot"><b>${esc(title)}</b>${body ? `<span>${esc(body)}</span>` : ""}</div><span class="cox" aria-hidden="true">✕</span>`;
  el.title = "Tap to dismiss"; el.hidden = false; fitCallout();
  calloutT = setTimeout(() => { el.hidden = true; }, kind === "bad" ? 7000 : 3200);
}
/* the callout covers the status line but not its Undo button */
function fitCallout() {
  const el = $("callout"), u = $("undoBtn"); if (!el || el.hidden) return;
  const bar = $("playBar").getBoundingClientRect(), r = u && u.offsetParent ? u.getBoundingClientRect() : null;
  el.style.right = r ? Math.max(0, bar.right - r.left + 6) + "px" : "0";
}
const hideCallout = () => { clearTimeout(calloutT); $("callout").hidden = true; };

/* ---------- shooting ---------- */
function playShoot() {
  const g = S.game; if (!g || !g.cb || g.over || g.choice || simAnim) return;
  hideCallout();
  const r = playRun(); if (!r) return;
  const ctx = { push: playArm === "push" && pushAvailable(g), call: playCall(), W: settings.W, L: settings.L };
  simPlay(r, () => playApply(r, ctx)); renderPlayBar();
}
/* a Play shot is rolling: it hasn't been refereed yet, so Undo just stops it and leaves the balls where they were */
const playRolling = () => !!(simAnim && simAnim.r && simAnim.r.kind === "play");
function playApply(r, ctx) {
  const g = S.game, wasBreak = g.phase === "break";
  pushUndo(g, true);
  if ((settings.playShots || 0) < AIM_HINT_SHOTS) { settings.playShots = (settings.playShots || 0) + 1; saveSettings(); }
  const g2 = ref(g, shotFacts(r), ctx);
  g2.pct = g.pct; g2.log = (g.log || []).concat([{ rack: g.rackNo, shot: g2.shots, by: g.turn, text: g2.last.text, fouls: g2.last.fouls }]).slice(-40);
  if (wasBreak) { g2.pct = g.pct != null ? g.pct : 40; S.speedPct = g2.pct; S.speed = speedOf(S.speedPct); S.tip = { x: 0, y: 0 }; S.vspin = vspinOf(S.tip); S.side = sideOf(S.tip); }
  else g2.pct = S.speedPct;
  S.game = g2; playArm = null; playPrep(); saveWork();
  const L = g2.last;
  if (L.fouls.length) { showCallout("bad", "Foul: " + L.fouls[0], (L.fouls.length > 1 ? "Also: " + L.fouls.slice(1).map(x => x[0].toLowerCase() + x.slice(1)).join("; ") + ". " : "") + L.text); buzz(); }
  else if (g2.over) showCallout("good", g2.over.why, "");
  else if (L.illegal) showCallout("warn", L.illegal, L.text.replace(L.illegal + ". ", ""));
  else showCallout("info", L.text, "");
  renderLog();
}
function playChoose(id) {
  const g = S.game; if (!g || !g.choice) return;
  pushUndo(g, false);
  const g2 = choose(g, id, playOpts());
  g2.pct = g.pct; g2.log = g.log || [];
  if (g2.phase === "break") { S.speedPct = 90; S.speed = speedOf(90); }
  S.game = g2; playPrep(); saveWork(); showCallout("info", g2.last.text, ""); renderLog();
}
function playAction(k) {
  const g = S.game;
  if (k === "shoot") return playShoot();
  if (k === "skip") { simStopAnim(); return; }
  if (k === "undo") return playUndo();
  if (k === "next") { playNew(g.kind, true); renderLog(); showCallout("info", S.game.last.text, ""); return; }
  if (k === "push") { playArm = playArm === "push" ? null : "push"; renderQuick(); return; }
  if (k === "left" || k === "right") { nudgeAim(k === "left" ? 1 : -1, .1); return; }
  if (k === "newgame") {
    if (playConfirm === "newgame") { playConfirm = null; playNew(g.kind, false); renderLog(); toast("New game. Score reset"); return; }
    playConfirm = "newgame"; clearTimeout(playConfirmT); playConfirmT = setTimeout(() => { playConfirm = null; renderGameCard(); }, 3500); renderGameCard(); return;
  }
}
/* Undo goes back one shot (or one choice) at a time, as far as the start of the rack. Each step keeps the table, turn,
   fouls, score and the stroke used; the game log isn't copied, only whether the step added a line to it. */
const UNDO_MAX = 150;
function undoList() {
  if (!Array.isArray(S.gameHist)) S.gameHist = S.gameUndo ? [Object.assign({ logged: true }, S.gameUndo)] : [];
  delete S.gameUndo;
  return S.gameHist;
}
function pushUndo(g, logged) {
  const snap = JSON.parse(JSON.stringify(Object.assign({}, g, { log: [] })));
  const h = undoList(); h.push({ game: snap, logged, speedPct: S.speedPct, tip: Object.assign({}, S.tip) });
  if (h.length > UNDO_MAX) h.splice(0, h.length - UNDO_MAX);
}
function playUndo() {
  if (playRolling()) { simCancelAnim(); playArm = null; hideCallout(); renderLog(); toast("Shot undone"); return; }
  const h = undoList(), u = h[h.length - 1]; if (!u || simAnim) return;
  h.pop();
  const log = (S.game && S.game.log) || u.game.log || [];
  S.game = Object.assign(u.game, { log: u.logged ? log.slice(0, -1) : log });
  S.speedPct = u.speedPct; S.speed = speedOf(u.speedPct);
  S.tip = u.tip; S.vspin = vspinOf(S.tip); S.side = sideOf(S.tip);
  playArm = null; hideCallout(); saveWork(); renderLog();
  toast(h.length ? `Undone. ${h.length} more to the start of the rack` : "Undone. Back at the start of the rack");
}
/* Fine aim: a tap turns 0.1°; holding repeats, faster after a second */
let fineT = 0, fineStart = 0, fineDir = 0;
function fineHold(dir) {
  fineStop(); fineDir = dir; fineStart = performance.now(); nudgeAim(dir, .1);
  const step = () => { const held = performance.now() - fineStart; nudgeAim(fineDir, held > 1500 ? .5 : .1); fineT = setTimeout(step, held > 1500 ? 50 : 80); };
  fineT = setTimeout(step, 400);
}
function fineStop() { clearTimeout(fineT); fineT = 0; }
/* left = anticlockwise as you look at the screen */
function nudgeAim(dir, deg) {
  const g = S.game; if (!g || !g.cb || simAnim) return;
  g.aim += dir * deg * Math.PI / 180; saveWork(); renderTable(); renderPlayInfo();
}
function playRack(k) {
  const g = S.game;
  if (g && g.kind === k) return;
  const busy = g && !g.over && (g.shots > 0 || g.score[0] + g.score[1] > 0);
  if (busy && playConfirm !== "rack" + k) {
    playConfirm = "rack" + k; clearTimeout(playConfirmT); playConfirmT = setTimeout(() => { playConfirm = null; }, 3500);
    toast(`Tap ${GAME_NAMES[k]} again to end this game and start a new one`); return;
  }
  playConfirm = null; S.rack = k; playNew(k, false); renderLog();
}
function setCall(o) {
  const g = S.game; if (!g) return;
  if (o.auto) g.callManual = null;
  else if (o.safety) g.callManual = g.callManual && g.callManual.safety ? null : { safety: true };
  else { const m = g.callManual && !g.callManual.safety ? Object.assign({}, g.callManual) : {}; Object.assign(m, o); g.callManual = m; }
  saveWork(); renderTable(); renderPlayInfo();
}

/* ---------- touch on the table ----------
   With ball in hand, press on or near the cue ball to move it; the aim stays on the ball it was on. Anywhere else, the
   aim line runs from the cue ball through your finger and follows it as you drag (further from the ball is finer). */
/* inches on the table that a distance of px screen pixels covers here */
function playInches(e, px) {
  const svg = $("tbl"), a = svgPt(svg, e, $("tblContent")), b = svgPt(svg, { clientX: e.clientX + px, clientY: e.clientY }, $("tblContent"));
  return a && b ? len(sub(a, b)) : 3.5;
}
const AIM_DEAD = 2.5;      // inches: closer than this to the cue ball the finger doesn't steer, the angle would jump about
function playDown(e) {
  const g = ensureGame(); if (simAnim || g.over || g.choice) return;
  const svg = $("tbl"), p = svgPt(svg, e, $("tblContent")); if (!p) return;
  hideCallout();
  const P = pockets(); let best = null, bd = 1e9;
  for (const k in P) { const d = len(sub(p, P[k].c)); if (d < bd) { bd = d; best = k; } }
  const offCloth = p.x < 0 || p.y < 0 || p.x > settings.W || p.y > settings.L;
  if (needsCall(g) && ((offCloth && bd < 7) || bd < 2.6)) { setCall({ pocket: best }); toast("Called: " + POCKET_NAMES[best].toLowerCase()); return; }
  if (offCloth || !g.cb) return;
  e.preventDefault(); svg.setPointerCapture(e.pointerId);
  /* a fingertip is bigger than the ball on a phone: grab it within about 30 screen pixels */
  if (g.inHand && len(sub(p, g.cb)) < Math.max(3.5, playInches(e, 30))) {
    const c = playContact(playLive()), on = c && g.balls.some(b => b.n === c.n) ? c.n : null;
    playDrag = { id: e.pointerId, kind: "cb", off: sub(g.cb, p), target: on }; showLoupe(p, e, g.cb); return;
  }
  playDrag = { id: e.pointerId, kind: "aim", p0: p, moved: false };
}
/* while aiming, the magnifier shows where the cue ball meets the first ball, or the point under your finger when it meets none */
function playLoupe() {
  const d = playDrag; if (!d || d.kind !== "aim" || !d.at) return;
  const c = playContact(playLive()); showLoupe(d.p, d.at, c ? c.ghost : d.p);
}
/* aim at the middle of ball n, or the usual default when it's gone */
function aimAtBall(g, n) {
  const b = n != null && g.balls.find(x => x.n === n);
  return b ? Math.atan2(b.y - g.cb.y, b.x - g.cb.x) : defaultAim(g);
}
function playMove(e) {
  const d = playDrag; if (!d || d.id !== e.pointerId) return;
  const g = S.game, p = svgPt($("tbl"), e, $("tblContent")); if (!p) return;
  if (d.kind === "cb") { const q = placeCb(g, add(p, d.off)); if (q) { g.cb = q; g.aim = aimAtBall(g, d.target); } showLoupe(p, e, g.cb); }
  else {
    if (!d.moved && len(sub(p, d.p0)) < .6) return;
    d.moved = true;
    if (len(sub(p, g.cb)) >= AIM_DEAD) g.aim = Math.atan2(p.y - g.cb.y, p.x - g.cb.x);
    d.p = p; d.at = { clientX: e.clientX, clientY: e.clientY }; playLoupe();
  }
  renderTable(); renderPlayBar(); renderQuick();
}
function playUp(e) {
  const d = playDrag; if (!d || d.id !== e.pointerId) return; playDrag = null; $("loupe").hidden = true;
  const g = S.game;
  if (d.kind === "aim" && !d.moved && e.type === "pointerup") { const p = svgPt($("tbl"), e, $("tblContent")); if (p && len(sub(p, g.cb)) >= AIM_DEAD) g.aim = Math.atan2(p.y - g.cb.y, p.x - g.cb.x); }
  saveWork(); renderTable(); renderPlayInfo();
}
