// Pool games for the Simulator's Play mode: racks, what a shot did, and a referee for 8-, 9- and 10-ball
// (WPA Rules of Play, 2025 edition). No side effects, so the tests load it without a page.
/* ---------- racks ---------- */
const GAME_NAMES = { "8": "8-ball", "9": "9-ball", "10": "10-ball" };
const groupOf = n => n === 8 ? "eight" : n < 8 ? "solids" : "stripes";
const GROUP_NAMES = { solids: "Solids", stripes: "Stripes" };
const otherP = p => 1 - p;
/* Shuffle in place with the given random function */
function shuffled(list, rnd) { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
/* The racked balls, apex on the foot spot (y = 3/4 of the length from the head cushion), rows toward the foot rail.
   9-ball (5.2): diamond, 1 at the apex, 9 in the middle. 10-ball (6.2): triangle, 1 at the apex, 10 in the middle of the
   third row. 8-ball (4.2): triangle, 8 in the middle of the third row, one solid and one stripe in the two back corners.
   The rest go in at random, and `gap` (inches) leaves the rack a little loose so no two breaks are the same. */
function rackLayout(kind, W, L, rnd, gap) {
  rnd = rnd || Math.random; gap = gap || 0;
  const rows = kind === "10" ? [1, 2, 3, 4] : kind === "8" ? [1, 2, 3, 4, 5] : [1, 2, 3, 2, 1];
  const slots = []; rows.forEach((k, r) => { for (let i = 0; i < k; i++) slots.push([r, i, k]); });
  const at = {};   // slot index -> ball number
  if (kind === "8") {
    at[4] = 8;
    const solid = 1 + Math.floor(rnd() * 7), stripe = 9 + Math.floor(rnd() * 7), flip = rnd() < .5;
    at[10] = flip ? solid : stripe; at[14] = flip ? stripe : solid;
    const rest = shuffled([1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15].filter(n => n !== solid && n !== stripe), rnd);
    slots.forEach((s, i) => { if (at[i] == null) at[i] = rest.shift(); });
  } else {
    const top = kind === "10" ? 10 : 9, mid = 4;
    at[0] = 1; at[mid] = top;
    const rest = shuffled(Array.from({ length: top - 2 }, (_, i) => i + 2), rnd);
    slots.forEach((s, i) => { if (at[i] == null) at[i] = rest.shift(); });
  }
  const d = 2 * R_BALL + gap;
  return slots.map(([r, i, k], s) => ({
    n: at[s],
    x: W / 2 + (i - (k - 1) / 2) * d + (gap ? (rnd() - .5) * gap : 0),
    y: L * .75 + r * d * Math.sqrt(3) / 2 + (gap ? (rnd() - .5) * gap : 0)
  }));
}
/* Spot a ball (1.5): on the long string as close as possible to the foot spot, toward the foot rail; if that whole
   line is blocked, toward the head of the table instead. */
function spotBall(n, balls, cb, W, L) {
  const others = balls.concat(cb ? [{ n: 0, x: cb.x, y: cb.y }] : []);
  const free = y => others.every(b => Math.hypot(b.x - W / 2, b.y - y) >= 2 * R_BALL - 1e-6);
  for (let y = L * .75; y <= L - R_BALL; y += .01) if (free(y)) return { n, x: W / 2, y };
  for (let y = L * .75; y >= R_BALL; y -= .01) if (free(y)) return { n, x: W / 2, y };
  return { n, x: W / 2, y: L * .75 };
}

/* ---------- a game ---------- */
function newRack(kind, breaker, score, opts) {
  opts = opts || {};
  return {
    kind, balls: rackLayout(kind, opts.W || 50, opts.L || 100, opts.rnd, opts.gap == null ? .03 : opts.gap),
    cb: null, inHand: "break", turn: breaker, breaker, phase: "break", shots: 0, fouls: [0, 0],
    groups: null, pushOK: false, choice: null, over: null, score: score || [0, 0], last: null, rackNo: (opts.rackNo || 0) + 1
  };
}
const lowestBall = g => g.balls.reduce((m, b) => Math.min(m, b.n), 99);
const onTable = (g, n) => g.balls.some(b => b.n === n);
/* 8-ball: the balls the shooter may hit first and call, or null when any but the 8 will do (open table) */
function eightTargets(g, p) {
  if (!g.groups) return null;
  const mine = g.groups[p], left = g.balls.filter(b => groupOf(b.n) === mine).map(b => b.n);
  return left.length ? left : [8];
}
/* the balls the shooter may hit first */
function legalFirst(g) {
  if (g.kind === "8") { if (g.phase === "break") return g.balls.map(b => b.n); const t = eightTargets(g, g.turn); return t || g.balls.map(b => b.n).filter(n => n !== 8); }
  return [lowestBall(g)];
}
/* the balls the shooter may call (8- and 10-ball); 10-ball: any ball, once the lowest is hit first */
function callable(g) {
  if (g.kind === "8") return legalFirst(g);
  if (g.kind === "10") return g.balls.map(b => b.n);
  return [];
}
const needsCall = g => (g.kind === "8" || g.kind === "10") && g.phase !== "break";

/* What a simulated shot did. Physics balls have ids "cb" and "b<number>". */
function shotFacts(r) {
  const cb = r.balls.find(b => b.id === "cb"), obs = r.balls.filter(b => b.id !== "cb");
  const num = id => +String(id).slice(1);
  const hit = cb.events.find(e => e.type === "hit");
  const firstT = hit ? hit.t : Infinity;
  const rail = r.balls.some(b => b.events.some(e => (e.type === "cushion" || e.type === "jaw") && e.t >= firstT));
  const railBalls = obs.filter(b => b.events.some(e => e.type === "cushion" || e.type === "jaw")).length;
  const end = b => b.path[b.path.length - 1];
  return {
    first: hit ? num(hit.other) : null,
    rail, railBalls,
    pocketed: obs.filter(b => b.potted && b.potted !== "off").map(b => ({ n: num(b.id), pocket: b.potted })),
    off: obs.filter(b => b.potted === "off").map(b => num(b.id)),
    cbPocket: cb.potted && cb.potted !== "off" ? cb.potted : null, cbOff: cb.potted === "off",
    cb: cb.potted ? null : { x: end(cb).x, y: end(cb).y },
    rest: obs.filter(b => !b.potted).map(b => ({ n: num(b.id), x: end(b).x, y: end(b).y }))
  };
}

/* ---------- the referee ----------
   ref(g, facts, ctx) -> the game after the shot. ctx: { push, call: {ball, pocket} | {safety: true}, W, L }.
   The new state's `last` says what happened: fouls (list of plain sentences), made, and a headline. */
function ref(g0, f, ctx) {
  ctx = ctx || {};
  const g = JSON.parse(JSON.stringify(g0)), p = g.turn, o = otherP(p), W = ctx.W || 50, L = ctx.L || 100;
  const isBreak = g.phase === "break", push = !!ctx.push && !isBreak, k = g.kind, top = k === "10" ? 10 : 9;
  const madeN = f.pocketed.map(b => b.n), downN = madeN.concat(f.off);
  const fouls = [];
  const legal = legalFirst(g);
  if (f.cbPocket) fouls.push("Scratch in the " + (POCKET_NAMES[f.cbPocket] || f.cbPocket).toLowerCase() + " pocket");
  if (f.cbOff) fouls.push("The cue ball left the table");
  if (!push) {
    if (f.first == null) fouls.push("The cue ball didn't hit a ball");
    else if (!legal.includes(f.first)) fouls.push(k === "8" ? (f.first === 8 ? "Hit the 8 first" : `Hit the ${f.first} first, which isn't your group`) : `Hit the ${f.first} first, not the ${legal[0]}`);
    if (!isBreak && f.first != null && !madeN.length && !f.rail) fouls.push("No ball reached a rail after contact");
  }
  for (const n of f.off) fouls.push(`The ${n} left the table`);
  if (isBreak && k !== "8" && !madeN.length && f.railBalls < 4) fouls.push(`Only ${f.railBalls} ball${f.railBalls === 1 ? "" : "s"} reached a rail on the break (four needed)`);
  const foul = fouls.length > 0;
  g.balls = f.rest.slice(); g.cb = f.cb;
  g.shots++; g.choice = null;
  const last = { by: p, fouls, made: madeN.slice(), push, isBreak, text: "" };
  g.last = last;
  const spot = n => { g.balls.push(spotBall(n, g.balls, g.cb, W, L)); };
  const end = (winner, why) => { g.over = { winner, why }; g.score[winner]++; g.phase = "over"; last.text = why; return g; };
  const pass = () => { g.turn = o; };
  const ballInHand = (where) => { g.inHand = where; };
  g.inHand = null;
  if (!g.cb) g.inHand = "anywhere";   // the cue ball is down: whoever shoots next places it

  const t0 = k === "8" ? eightTargets(g0, p) : null, cleared = !!(t0 && t0.length === 1 && t0[0] === 8);
  if (k === "8") return ref8(g, f, ctx, { p, o, foul, isBreak, madeN, downN, last, spot, end, pass, ballInHand, cleared });

  /* 9-ball and 10-ball */
  const wasPushOK = g.pushOK; g.pushOK = false;
  const topDown = downN.includes(top);
  if (foul) {
    if (topDown) spot(top);
    g.fouls[p]++;
    g.phase = "play";
    if (g.fouls[p] >= 3) return end(o, `Three fouls in a row: rack to ${playerName(o)}`);
    pass(); ballInHand("anywhere");
    last.text = playerName(o) + " has ball in hand";
    return g;
  }
  g.fouls[p] = 0;
  if (push) {
    if (topDown) spot(top);
    g.phase = "play";
    g.choice = { kind: "push", by: o, options: [["shoot", "Shoot from here"], ["pass", "Hand it back"]] };
    last.text = `${playerName(p)} pushed out. ${playerName(o)} picks who shoots`;
    return g;
  }
  if (isBreak) {
    g.phase = "play"; g.pushOK = true;
    if (k === "9" && topDown) return end(p, "9 on the break: rack to " + playerName(p));
    if (topDown) spot(top);
    if (madeN.length) { last.text = `${playerName(p)} made ${madeN.length} on the break and shoots again`; return g; }
    pass(); last.text = "Nothing down on the break. " + playerName(o) + " to shoot"; return g;
  }
  g.phase = "play";
  if (k === "9") {
    if (topDown) return end(p, "9-ball made: rack to " + playerName(p));
    if (madeN.length) { last.text = `${playerName(p)} shoots again`; return g; }
    pass(); last.text = playerName(o) + " to shoot"; return g;
  }
  /* 10-ball: called shots (6.5 to 6.8) */
  const c = ctx.call || {}, called = c.ball != null && f.pocketed.some(b => b.n === c.ball && b.pocket === c.pocket);
  if (called) {
    if (c.ball === 10 && !g.balls.length) return end(p, "10-ball made on a called shot: rack to " + playerName(p));
    if (topDown) spot(10);
    last.text = `${playerName(p)} made the called ${c.ball} and shoots again`; return g;
  }
  if (topDown) spot(10);
  if (madeN.length) {
    g.choice = { kind: "option", by: o, options: [["shoot", "Shoot from here"], ["pass", "Hand it back"]] };
    last.text = `Not the called shot. ${playerName(o)} picks who shoots`; return g;
  }
  pass(); last.text = playerName(o) + " to shoot"; return g;
}
function ref8(g, f, ctx, h) {
  const { p, o, foul, isBreak, madeN, downN, last, spot, end, pass, ballInHand, cleared } = h;
  const eightDown = downN.includes(8);
  if (isBreak) {
    g.phase = "play";
    if (eightDown) {
      if (foul) { g.choice = { kind: "eightFoulBreak", by: o, options: [["spot", "Spot the 8, ball in hand"], ["rebreak", "Re-rack and break"]] }; last.text = `8 down on a foul break. ${playerName(o)} chooses`; return g; }
      g.choice = { kind: "eightBreak", by: p, options: [["spot", "Spot the 8 and carry on"], ["rebreak", "Re-rack and break again"]] }; last.text = "8 on the break. " + playerName(p) + " chooses"; return g;
    }
    if (foul) { pass(); ballInHand("kitchen"); last.text = `Foul on the break. ${playerName(o)} has ball in hand behind the head string`; return g; }
    if (!madeN.length && f.railBalls < 4) {
      g.choice = { kind: "illegalBreak", by: o, options: [["accept", "Play from here"], ["rerack", "Re-rack, I break"], ["rebreak", "Re-rack, they break again"]] };
      last.fouls = []; last.illegal = `Illegal break: only ${f.railBalls} ball${f.railBalls === 1 ? "" : "s"} reached a rail`;
      last.text = `${last.illegal}. ${playerName(o)} chooses`; return g;
    }
    if (madeN.length) { last.text = `${playerName(p)} made ${madeN.length} on the break and shoots again. The table is open`; return g; }
    pass(); last.text = "Nothing down on the break. The table is open. " + playerName(o) + " to shoot"; return g;
  }
  g.phase = "play";
  const c = ctx.call || {};
  if (eightDown) {
    const inCalled = f.pocketed.some(b => b.n === 8 && c.ball === 8 && b.pocket === c.pocket);
    if (f.off.includes(8)) return end(o, `The 8 left the table: rack to ${playerName(o)}`);
    if (foul) return end(o, `8 down on a foul: rack to ${playerName(o)}`);
    if (!cleared) return end(o, `8 down before clearing the group: rack to ${playerName(o)}`);
    if (!inCalled) return end(o, `8 in a pocket that wasn't called: rack to ${playerName(o)}`);
    return end(p, "8-ball made: rack to " + playerName(p));
  }
  if (foul) { pass(); ballInHand("anywhere"); last.text = playerName(o) + " has ball in hand"; return g; }
  if (c.safety) { pass(); last.text = `Safety. ${playerName(o)} to shoot`; return g; }
  const called = c.ball != null && f.pocketed.some(b => b.n === c.ball && b.pocket === c.pocket);
  if (called) {
    if (!g.groups) { const mine = groupOf(c.ball); g.groups = { [p]: mine, [o]: mine === "solids" ? "stripes" : "solids" }; last.groups = `${playerName(p)} has ${GROUP_NAMES[mine].toLowerCase()}`; }
    last.text = `${playerName(p)} made the called ${c.ball}${last.groups ? " and has " + GROUP_NAMES[g.groups[p]].toLowerCase() : ""}, and shoots again`; return g;
  }
  pass(); last.text = (madeN.length ? "Not the called shot. " : "") + playerName(o) + " to shoot"; return g;
}
/* the player who chose takes the option; returns the new game */
function choose(g0, id, opts) {
  const g = JSON.parse(JSON.stringify(g0)), ch = g.choice; if (!ch) return g;
  opts = opts || {};
  const W = opts.W || 50, L = opts.L || 100, by = ch.by;
  g.choice = null;
  const rerack = breaker => Object.assign(newRack(g.kind, breaker, g.score, Object.assign({}, opts, { rackNo: g.rackNo - 1 })), { last: { text: `${playerName(breaker)} breaks`, fouls: [] } });
  if (ch.kind === "push" || ch.kind === "option") { g.turn = id === "shoot" ? by : otherP(by); g.last = { text: `${playerName(g.turn)} to shoot`, fouls: [] }; return g; }
  if (ch.kind === "illegalBreak") {
    if (id === "accept") { g.turn = by; g.last = { text: `${playerName(by)} plays the table as it lies`, fouls: [] }; return g; }
    return rerack(id === "rerack" ? by : otherP(by));
  }
  if (ch.kind === "eightBreak" || ch.kind === "eightFoulBreak") {
    if (id === "rebreak") return rerack(by);
    g.balls.push(spotBall(8, g.balls, g.cb, W, L));
    g.turn = by;
    if (ch.kind === "eightFoulBreak") g.inHand = "kitchen";
    g.last = { text: `8 spotted. ${playerName(by)} to shoot${g.inHand === "kitchen" ? " with ball in hand behind the head string" : ""}`, fouls: [] };
    return g;
  }
  return g;
}
/* Push out (the user's house rule on top of WPA 5.4 / 6.4): only on the shot after a foul-free break, and only when the
   cue ball has no straight line to any part of the lowest ball. Cushions don't count: a kick is not a line of sight. */
function canSee(cb, target, others) {
  const dx = target.x - cb.x, dy = target.y - cb.y, d = Math.hypot(dx, dy), D = 2 * R_BALL;
  if (d <= D) return true;
  const c = Math.atan2(dy, dx), half = Math.asin(Math.min(1, D / d));
  for (let i = 0; i <= 240; i++) {
    const a = c - half * .999 + 2 * half * .999 * i / 240, ux = Math.cos(a), uy = Math.sin(a);
    const hitAt = b => { const px = b.x - cb.x, py = b.y - cb.y, along = px * ux + py * uy; if (along <= 0) return Infinity; const off2 = px * px + py * py - along * along; return off2 >= D * D ? Infinity : along - Math.sqrt(D * D - off2); };
    const tt = hitAt(target);
    if (tt < Infinity && others.every(b => hitAt(b) > tt)) return true;
  }
  return false;
}
function pushAvailable(g) {
  if (!g.pushOK || g.kind === "8" || !g.cb || g.choice || g.phase !== "play") return false;
  const low = g.balls.find(b => b.n === lowestBall(g)); if (!low) return false;
  return !canSee(g.cb, low, g.balls.filter(b => b !== low));
}
let PLAYER_NAMES = ["Player 1", "Player 2"];
const playerName = p => PLAYER_NAMES[p] || "Player " + (p + 1);
