// Stats tab for shots: summaries, sessions, progress, miss pattern, scatter and pocket entry strip.
/* ---------- stats ---------- */
const F = { drill: "__all", vspin: "all", session: "__all" };
function mean(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; }
function sd(a) { if (a.length < 2) return null; const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); }
function summarize(list) {
  const withOut = list.filter(s => s.outcome); const made = withOut.filter(s => s.outcome === "made").length;
  const errs = list.map(s => s.cbErr).filter(v => v != null);
  const offs = list.map(s => s.pocketOff).filter(v => v != null);
  const zs = list.filter(s => s.inZone === 0 || s.inZone === 1);
  const lr = list.map(missLR).filter(Boolean);
  return { long: mean(lr.map(v => v.long)), side: mean(lr.map(v => v.side)), lrN: lr.length, zone: zs.length ? zs.filter(s => s.inZone === 1).length / zs.length : null, zoneN: zs.length, n: list.length, pot: withOut.length ? made / withOut.length : null, potN: withOut.length, err: mean(errs), errN: errs.length, bias: mean(offs), spread: sd(offs), offN: offs.length };
}
/* Cue ball miss in the shot's own frame: long (+) / short (-) along the line the cue ball
   travelled toward its target, right (+) / left (-) across it. The cue ball leaves from the
   object ball when there is one, otherwise from its start. */
function missLR(s) {
  if (s.cbDx == null || !s.target) return null;
  const from = s.ob || s.cb; if (!from) return null;
  const d = sub(s.target, from); const l = len(d); if (l < 3) return null;
  const u = { x: d.x / l, y: d.y / l }, e = { x: s.cbDx, y: s.cbDy };
  return { long: dot(e, u), side: u.y * e.x - u.x * e.y };
}
const cutBand = s => s.cut == null ? null : (a => a < 10 ? 0 : a < 25 ? 1 : a < 40 ? 2 : 3)(Math.abs(s.cut));
const CUTS = [[0, "0–10°"], [1, "10–25°"], [2, "25–40°"], [3, "40°+"]];
const BREAKS = { speed: ["Speed", s => s.speed, SPEED], side: ["Side spin", s => s.side, SIDE], cut: ["Cut angle", cutBand, CUTS] };
let BK = "speed", progSel = null;
const lsTxt = v => v == null ? "–" : Math.abs(v) < .05 ? "on line" : fl(Math.abs(v), 1) + " " + (v > 0 ? "long" : "short");
const sdTxt = v => v == null ? "–" : Math.abs(v) < .05 ? "on line" : fl(Math.abs(v), 1) + " " + (v > 0 ? "right" : "left");
function breakdownRows(list) {
  const [, f, cats] = BREAKS[BK];
  return cats.map(([k, l]) => [l, summarize(list.filter(s => f(s) === k))]).filter(r => r[1].n);
}
function filtered(ignoreSession) { return shots.filter(s => !isBrk(s) && (F.drill === "__all" || (s.drill || "") === F.drill) && (F.vspin === "all" || s.vspin === F.vspin) && (ignoreSession || F.session === "__all" || sessionOf(s) === F.session)); }
const pct = v => v == null ? "–" : Math.round(v * 100) + "%";
let statsMode = "shot";
/* Detailed panels on the Stats tab start folded; this remembers which ones you opened while the app is open. */
const foldOpen = {};
function renderStats() {
  const v = $("view-stats");
  const hasBrk = shots.some(isBrk), hasShot = shots.some(s => !isBrk(s));
  if (statsMode === "break" && !hasBrk && hasShot) statsMode = "shot";
  if (statsMode === "shot" && !hasShot && hasBrk) statsMode = "break";
  const seg = `<nav class="modeseg" role="tablist" aria-label="Stats for"><button role="tab" data-smode="shot" aria-selected="${statsMode === "shot"}">Shots</button><button role="tab" data-smode="break" aria-selected="${statsMode === "break"}">Cut breaks</button></nav>`;
  if (statsMode === "break") { renderBreakStats(v, seg); return; }
  if (!hasShot) { v.innerHTML = seg + emptyState("No shots yet", "Log a few shots on the Log tab and your accuracy shows up here: pot rate, how far the cue ball finished from your target, and where balls enter the pocket."); return; }
  const drills = [...new Set(shots.filter(s => !isBrk(s)).map(s => s.drill || ""))];
  if (F.drill !== "__all" && !drills.includes(F.drill)) F.drill = "__all";
  const sess = sessions(s => !isBrk(s));
  if (F.session !== "__all" && !sess.some(x => x.id === F.session)) F.session = "__all";
  const list = filtered(); const t = summarize(list);
  const groups = new Map(); for (const s of filtered(true)) { const k = sessionOf(s); (groups.get(k) || groups.set(k, []).get(k)).push(s); }
  const bySess = sess.filter(x => groups.has(x.id)).map(x => [x, summarize(groups.get(x.id))]);
  const vs = VLAB.map(([k, lbl]) => [k, lbl, summarize(list.filter(s => s.vspin === k))]).filter(r => r[2].n);
  const vchips = VSPIN.concat(shots.some(s => s.vspin === "centre") ? [["centre", "Centre ball"]] : []);
  v.innerHTML = seg + `
  <div class="filters">
    <select id="fDrill" aria-label="Drill"><option value="__all">All drills (${shots.filter(s => !isBrk(s)).length} shots)</option>${drills.map(d => `<option value="${esc(d)}" ${F.drill === d ? "selected" : ""}>${esc(d || "Unnamed drill")} (${drillShots(d).length})</option>`).join("")}</select>
    <select id="fSession" aria-label="Session"><option value="__all">All sessions (${sess.length})</option>${sess.map(x => `<option value="${esc(x.id)}" ${F.session === x.id ? "selected" : ""}>${esc(sessionLabel(x.start))} (${x.n})</option>`).join("")}</select>
    <div class="chips" id="fVspin">${[["all", "All spins"]].concat(vchips).map(([k, l]) => `<button class="chip" aria-pressed="${F.vspin === k}" data-f="${k}">${l}</button>`).join("")}</div>
  </div>
  <div class="tiles">
    <div class="tile"><span class="v">${t.n}</span><span class="k">shots${F.session === "__all" ? "" : " this session"}</span></div>
    <div class="tile"><span class="v">${t.pot == null ? "–" : Math.round(t.pot * 100)}<small>%</small></span><span class="k">potted (${t.potN} with a result)</span></div>
    <div class="tile"><span class="v">${pct(t.zone).replace("%", "")}${t.zone == null ? "" : "<small>%</small>"}</span><span class="k">cue ball in target zone (${t.zoneN})</span></div>
    <div class="tile"><span class="v">${fl(t.err, 1)}<small> ${uName()}</small></span><span class="k">avg cue ball miss from target (${t.errN})</span></div>
    <div class="tile"><span class="v">${t.bias == null ? "–" : (t.bias >= 0 ? "+" : "") + fl(t.bias, 2)}<small> ${uName()}</small></span><span class="k">pocket bias, spread ±${fls(t.spread, 2)}</span></div>
  </div>
  <div class="panel">
    <h2>Progress over sessions</h2>
    <div class="sub">Oldest session on the left. Tap a dot for its numbers.</div>
    <div class="prog" id="prog"></div>
    <div class="tip" id="progTip"></div>
  </div>
  <div class="panel">
    <h2>Session by session</h2>
    <div class="sub">Newest first, for the drill and spin picked above. Arrows compare with the session before.</div>
    <div class="scroll" tabindex="0" role="region" aria-label="Table, scrolls sideways"><table class="t"><thead><tr><th>Session</th><th>Shots</th><th>Pot</th><th>In zone</th><th>CB miss</th></tr></thead><tbody>
    ${bySess.map(([x, s], i) => { const prev = bySess[i + 1] ? bySess[i + 1][1] : null;
      const arrow = (a, b, lowerBetter) => a == null || b == null || Math.abs(a - b) < 1e-9 ? "" : ((lowerBetter ? a < b : a > b) ? ' <span style="color:var(--good)">▲</span>' : ' <span style="color:var(--bad)">▼</span>');
      return `<tr${x.id === F.session ? ' style="background:var(--accent-soft)"' : ""}><td>${esc(sessionLabel(x.start))}</td><td>${s.n}</td><td>${pct(s.pot)}${prev ? arrow(s.pot, prev.pot) : ""}</td><td>${pct(s.zone)}${prev ? arrow(s.zone, prev.zone) : ""}</td><td>${fl(s.err, 1)}${prev ? arrow(s.err, prev.err, true) : ""}</td></tr>`; }).join("")}
    </tbody></table></div>
    <p class="note">A new session starts after 2 hours without a shot, or when you tap New session on the Log tab.</p>
  </div>
  <div class="panel">
    <h2>Cue ball miss pattern</h2>
    <div class="sub">Every shot with a target, turned so the cue ball travels up the chart. The cross is the target; the dashed ring holds about two thirds of your shots.</div>
    <svg id="miss" role="img" aria-label="Cue ball misses relative to the target"></svg>
    <div class="tip" id="missTip"></div>
  </div>
  <div class="panel">
    <h2>Where the cue ball stopped</h2>
    <div class="legend"><span><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="#fbfaf4" stroke="#111" stroke-width="1.5"/></svg>Cue ball result</span><span><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="2 2"/></svg>Target and zone</span></div>
    <div class="scwrap"><div class="chartbox"><svg id="scatter" viewBox="${viewBox()}" role="img" aria-label="Cue ball finishing positions on the table"></svg></div><div class="picker" id="picker" aria-label="Shots"></div></div>
    <div class="shotbar"><button class="btn small" id="shotPrev" aria-label="Previous shot">‹ Prev</button><button class="btn small" id="shotNext" aria-label="Next shot">Next ›</button><button class="btn small" id="shotAll">Show all</button><div class="tip" id="scTip"></div></div>
  </div>
  <details class="panel fold" data-fold="spin"${foldOpen.spin ? " open" : ""}>
    <summary><h2>By vertical spin</h2></summary>
    <div class="foldbody">
    <div class="scroll" tabindex="0" role="region" aria-label="Table, scrolls sideways"><table class="t"><thead><tr><th>Spin</th><th>Shots</th><th>Pot</th><th>In zone</th><th>CB miss</th><th>Long/short</th><th>Bias</th><th>Spread</th></tr></thead><tbody>
    ${vs.map(([k, l, s]) => `<tr><td>${l}</td><td>${s.n}</td><td>${pct(s.pot)}</td><td>${pct(s.zone)}</td><td>${fl(s.err, 1)}</td><td>${lsTxt(s.long)}</td><td>${s.bias == null ? "–" : (s.bias >= 0 ? "+" : "") + fl(s.bias, 2)}</td><td>${fl(s.spread, 2)}</td></tr>`).join("")}
    </tbody></table></div>
    <ul class="notelist">
      <li><b>CB miss</b>: distance in <b>${isMetric() ? "cm" : "inches"}</b> from your target to where the cue ball stopped</li>
      <li><b>Long/short</b>: measured along the line the cue ball travelled to its target</li>
      <li><b>Bias</b>: average pocket entry offset (<b>+</b> is right of centre, seen from the object ball)</li>
      <li><b>Spread</b>: how much the pocket entry varies (standard deviation)</li>
    </ul>
    </div>
  </details>
  <details class="panel fold" data-fold="breakdown"${foldOpen.breakdown ? " open" : ""}>
    <summary><h2>Breakdown</h2></summary>
    <div class="foldbody">
    <div class="chips" id="bkChips">${Object.entries(BREAKS).map(([k, [l]]) => `<button class="chip sm" aria-pressed="${BK === k}" data-bk="${k}">${l}</button>`).join("")}</div>
    <div class="scroll" tabindex="0" role="region" aria-label="Table, scrolls sideways"><table class="t"><thead><tr><th>${BREAKS[BK][0]}</th><th>Shots</th><th>Pot</th><th>In zone</th><th>CB miss</th><th>Long/short</th><th>Left/right</th></tr></thead><tbody>
    ${breakdownRows(list).map(([l, s]) => `<tr><td>${l}</td><td>${s.n}</td><td>${pct(s.pot)}</td><td>${pct(s.zone)}</td><td>${fl(s.err, 1)}</td><td>${lsTxt(s.long)}</td><td>${sdTxt(s.side)}</td></tr>`).join("") || `<tr><td colspan="7">No shots for this filter.</td></tr>`}
    </tbody></table></div>
    </div>
  </details>
  <details class="panel fold" data-fold="entry"${foldOpen.entry ? " open" : ""}>
    <summary><h2>Pocket entry offset</h2></summary>
    <div class="foldbody">
    <div class="sub">Each dot is one shot, measured across the pocket from the object ball's view. The band is the pocket mouth.</div>
    <svg id="strip" role="img" aria-label="Pocket entry offsets"></svg>
    <div class="legend"><span><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="var(--good)"/></svg>Made</span><span><svg width="14" height="14"><circle cx="7" cy="7" r="4.5" fill="none" stroke="var(--warn)" stroke-width="2"/></svg>Rattled out</span><span><svg width="14" height="14"><path d="M3 3l8 8M11 3l-8 8" stroke="var(--bad)" stroke-width="2.2"/></svg>Missed</span></div>
    <div class="tip" id="stTip"></div>
    </div>
  </details>`;
  drawScatter(list); drawStrip(list); drawMiss(list); drawProgress(bySess.slice().reverse());
}
const nice = v => { const c = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100]; return c.find(x => x >= v) || Math.ceil(v / 50) * 50; };
function drawMiss(list) {
  const svg = $("miss"), pts = list.map(s => [s, missLR(s)]).filter(r => r[1]);
  const S2 = 300, c = S2 / 2, pad = 26;
  if (!pts.length) { svg.setAttribute("viewBox", `0 0 ${S2} 40`); svg.innerHTML = ""; $("missTip").textContent = "No shots with a target yet. Place a target on the Log tab."; return; }
  const lim = nice(Math.max(...pts.map(([, v]) => Math.max(Math.abs(toU(v.long)), Math.abs(toU(v.side))))) * 1.05);
  const k = (c - pad) / lim, X = v => c + toU(v) * k, Y = v => c - toU(v) * k;
  let g = "";
  const step = nice(lim / 3);
  for (let r = step; r <= lim + 1e-9; r += step) g += `<circle cx="${c}" cy="${c}" r="${r * k}" fill="none" stroke="var(--line)"/><text x="${c + 3}" y="${c - r * k - 3}" font-size="12" fill="var(--muted)" font-family="var(--f-mono)">${r}</text>`;
  g += `<line x1="${pad / 2}" x2="${S2 - pad / 2}" y1="${c}" y2="${c}" stroke="var(--line)"/><line y1="${pad / 2}" y2="${S2 - pad / 2}" x1="${c}" x2="${c}" stroke="var(--line)"/>`;
  g += `<text x="${c}" y="11" font-size="11" text-anchor="middle" fill="var(--muted)">Long ↑</text><text x="${c}" y="${S2 - 3}" font-size="11" text-anchor="middle" fill="var(--muted)">Short ↓</text><text x="3" y="${c - 5}" font-size="11" fill="var(--muted)">Left</text><text x="${S2 - 3}" y="${c - 5}" font-size="11" text-anchor="end" fill="var(--muted)">Right</text><text x="${S2 - 3}" y="11" font-size="12" text-anchor="end" fill="var(--muted)" font-family="var(--f-mono)">${uName()}</text>`;
  pts.forEach(([s, v], i) => {
    const col = s.inZone === 1 ? "var(--good)" : s.inZone === 0 ? "var(--bad)" : "var(--ink)";
    g += `<circle cx="${X(v.side)}" cy="${Y(v.long)}" r="4" fill="${col}" fill-opacity=".75" stroke="var(--panel)" stroke-width="1.5"/>`;
    g += `<circle class="hit" data-i="${i}" cx="${X(v.side)}" cy="${Y(v.long)}" r="9" fill="transparent"/>`;
  });
  const mL = mean(pts.map(r => r[1].long)), mS = mean(pts.map(r => r[1].side));
  if (pts.length >= 3) {
    const sL = sd(pts.map(r => r[1].long)), sS = sd(pts.map(r => r[1].side));
    g += `<ellipse cx="${X(mS)}" cy="${Y(mL)}" rx="${Math.max(2, toU(sS) * k)}" ry="${Math.max(2, toU(sL) * k)}" fill="var(--accent-soft)" fill-opacity=".5" stroke="var(--accent)" stroke-width="2" stroke-dasharray="5 4"/>`;
  }
  g += `<path d="M${c - 7} ${c}h14M${c} ${c - 7}v14" stroke="var(--ink)" stroke-width="2.5"/>`;
  g += `<line x1="${c}" y1="${c}" x2="${X(mS)}" y2="${Y(mL)}" stroke="var(--accent)" stroke-width="2"/><circle cx="${X(mS)}" cy="${Y(mL)}" r="6" fill="var(--accent)" stroke="var(--panel)" stroke-width="2"/>`;
  svg.setAttribute("viewBox", `0 0 ${S2} ${S2}`); svg.innerHTML = g;
  const sum = `Average of ${pts.length}: ${lsTxt(mL)}, ${sdTxt(mS)} (big dot). Green finished in the zone, red outside. Tap a dot for that shot.`;
  $("missTip").textContent = sum;
  svg.onclick = e => { const h = e.target.closest(".hit"); if (!h) { $("missTip").textContent = sum; return; } const [s, v] = pts[+h.dataset.i];
    $("missTip").textContent = `${s.drill || "Unnamed drill"} #${s.shotNo} · ${lsTxt(v.long)}, ${sdTxt(v.side)} · ${label(VLAB, s.vspin)}, ${s.speedPct != null ? s.speedPct + "%" : label(SPEED, s.speed)}`; };
}
function drawProgress(rows) {
  const box = $("prog");
  if (rows.length < 2) { box.innerHTML = ""; $("progTip").textContent = `Progress lines appear once you have two sessions for this filter (you have ${rows.length}).`; return; }
  const maxErr = Math.max(...rows.map(r => toU(r[1].err) || 0));
  const M = [["pot", "Pot rate", v => v == null ? null : v * 100, 100, "%"], ["zone", "Cue ball in zone", v => v == null ? null : v * 100, 100, "%"], ["err", "Avg cue ball miss", v => toU(v), nice(maxErr || 1), " " + uName()]];
  const Wd = 320, H = 92, l = 34, r = 10, t = 10, b = 16;
  box.innerHTML = M.map(([key, name, f, top, unit]) => {
    const vals = rows.map(r => f(r[1][key])); const n = rows.length;
    const X = i => l + (n === 1 ? 0 : i * (Wd - l - r) / (n - 1)), Y = v => t + (1 - v / top) * (H - t - b);
    let g = [0, top / 2, top].map(v => `<line x1="${l}" x2="${Wd - r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${l - 5}" y="${Y(v) + 3.5}" font-size="12" text-anchor="end" fill="var(--muted)" font-family="var(--f-mono)">${Math.round(v)}${unit.trim() === "%" ? "%" : ""}</text>`).join("");
    let d = "", pen = false;
    vals.forEach((v, i) => { if (v == null) { pen = false; return; } d += (pen ? "L" : "M") + X(i).toFixed(1) + " " + Y(Math.min(v, top)).toFixed(1); pen = true; });
    g += `<path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    vals.forEach((v, i) => { if (v == null) return; const on = progSel === i;
      g += `<circle cx="${X(i)}" cy="${Y(Math.min(v, top))}" r="${on ? 5.5 : 4}" fill="var(--accent)" stroke="var(--panel)" stroke-width="2"/><rect class="hit" data-i="${i}" x="${X(i) - 12}" y="0" width="24" height="${H}" fill="transparent"/>`; });
    const last = vals.filter(v => v != null).pop();
    return `<div class="pm"><div class="pmh"><span>${name}</span><b>${last == null ? "–" : (unit === "%" ? Math.round(last) : fmt(last, 1)) + unit}</b></div><svg viewBox="0 0 ${Wd} ${H}" role="img" aria-label="${name} by session">${g}</svg></div>`;
  }).join("");
  const tip = i => { const [x, s] = rows[i]; return `${sessionLabel(x.start)} · ${s.n} shots · pot ${pct(s.pot)} · in zone ${pct(s.zone)} · miss ${fls(s.err, 1)}`; };
  $("progTip").textContent = progSel != null && rows[progSel] ? tip(progSel) : "The big number is your latest session.";
  box.onclick = e => { const h = e.target.closest(".hit"); if (!h) return; progSel = +h.dataset.i; drawProgress(rows); };
}
let selShot = null;
function scatterLine(s) {
  return `${s.drill || "Unnamed drill"} #${s.shotNo} · ${label(VLAB, s.vspin)}, ${label(SIDE, s.side).toLowerCase()}, ${speedText(s)}` +
    (s.inZone === 1 ? " · in zone" : s.inZone === 0 ? " · outside zone" : "") +
    (s.cbErr != null ? ` · ${fls(s.cbErr, 1)} from target` : "") +
    (s.outcome ? ` · ${label(OUTCOME, s.outcome).toLowerCase()}` : "") +
    (s.pocketOff != null ? ` (${sgn(s.pocketOff, 2)})` : "") + (s.notes ? ` · "${s.notes}"` : "");
}
function drawScatter(list) {
  const svg = $("scatter"); svg.style.aspectRatio = aspect(); let g = `<g>${staticTable()}</g>`;
  const all = list.filter(s => s.result);
  if (selShot && !all.some(s => s.id === selShot)) selShot = null;
  const one = selShot ? all.find(s => s.id === selShot) : null;
  // picker: one row per shot, oldest first so the numbers read in order
  $("picker").innerHTML = all.map(s => `<button data-pick="${esc(s.id)}" aria-pressed="${s.id === selShot}"><b>#${s.shotNo}${s.inZone === 1 ? ' <i class="ok" aria-label="in zone">✓</i>' : s.inZone === 0 ? ' <i class="no" aria-label="outside zone">✗</i>' : ""}</b><span>${esc(label(VLAB, s.vspin))}${s.cbErr != null ? " " + fl(s.cbErr, 1) + uName() : ""}</span></button>`).join("");
  $("scTip").textContent = one ? scatterLine(one) : `${all.length} shots shown. Tap a ball or a shot in the list to see it on its own.`;
  $("shotAll").hidden = !one;
  if (one) {
    // the selected shot on its own: start positions, shot lines, target, result and pocket entry
    const P = pockets(); const pk = P[one.pocket];
    if (one.ob && pk) { g += line(one.ob, pk.c, "#ffffff", "4 3", .55); if (one.cb) { const u = unit(sub(pk.c, one.ob)); g += line(one.cb, sub(one.ob, mul(u, 2 * R_BALL)), "#ffffff", "2 3", .45); } }
    if (one.target) g += zoneSvg(zoneShape(one.target, one.tz), .16) + ballSvg(one.target, "target");
    if (one.target) g += line(one.target, one.result, "var(--marker)", "", .95);
    if (one.cb) g += ballSvg(one.cb, "cb");
    if (one.ob) g += ballSvg(one.ob, "ob");
    g += ballSvg(one.result, "result");
    if (one.entry) { const e = toSvg(one.entry); g += `<circle cx="${e.x}" cy="${e.y}" r=".55" fill="#f2b705" stroke="#1b1b1b" stroke-width="1" vector-effect="non-scaling-stroke"/>`; }
    svg.innerHTML = `<g transform="${rotAttr()}">${g}</g>`;
    svg.onclick = () => {};
    const btn = $("picker").querySelector('[aria-pressed="true"]'); if (btn) btn.scrollIntoView({ block: "nearest" });
    return;
  }
  const pts = all;
  for (const s of pts) if (s.target) g += line(s.target, s.result, "var(--marker)", "", .35);
  const targets = new Map(); for (const s of pts) if (s.target) targets.set(s.target.x + "," + s.target.y + "," + (s.tz || ""), s);
  for (const s of targets.values()) g += zoneSvg(zoneShape(s.target, s.tz), .12) + ballSvg(s.target, "target");
  pts.forEach((s, i) => { const q = toSvg(s.result); g += `<circle cx="${q.x}" cy="${q.y}" r="${R_BALL}" fill="#fbfaf4" fill-opacity=".85" stroke="#111111" stroke-width="1.2" vector-effect="non-scaling-stroke"/><circle class="hit" data-i="${i}" cx="${q.x}" cy="${q.y}" r="${R_BALL * 2.2}" fill="transparent"/>`; });
  svg.innerHTML = `<g transform="${rotAttr()}">${g}</g>`;
  svg.onclick = e => {
    const h = e.target.closest(".hit"); if (!h) return; selShot = pts[+h.dataset.i].id; renderStats();
  };
}
function drawStrip(list) {
  const svg = $("strip"); const pts = list.filter(s => s.pocketOff != null);
  const Wd = 340, H = 120, pad = 22, m = isMetric(), lim = m ? 7 : 3;     // axis in the display unit
  const x = v => pad + (Math.max(-lim, Math.min(lim, toU(v))) + lim) / (2 * lim) * (Wd - 2 * pad);
  const half = settings.wc / 2;
  let g = `<rect x="${x(-half)}" y="14" width="${x(half) - x(-half)}" height="${H - 40}" rx="4" fill="var(--accent-soft)"/>`;
  for (let k = -lim; k <= lim; k++) { const xi = x(fromU(k)); g += `<line x1="${xi}" x2="${xi}" y1="14" y2="${H - 26}" stroke="var(--line)" stroke-width="1"/>` + (m && k % 2 ? "" : `<text x="${xi}" y="${H - 10}" font-size="11" text-anchor="middle" fill="var(--muted)" font-family="var(--f-mono)">${k > 0 ? "+" + k : k}</text>`); }
  g += `<text x="${Wd - 4}" y="11" font-size="12" text-anchor="end" fill="var(--muted)" font-family="var(--f-mono)">${uName()}</text>`;
  g += `<line x1="${x(0)}" x2="${x(0)}" y1="10" y2="${H - 26}" stroke="var(--ink)" stroke-width="1.5"/>`;
  // stack dots into bins so they don't overlap
  const bins = {}; const bw = .2;
  pts.forEach((s, i) => {
    const b = Math.round(s.pocketOff / bw); bins[b] = (bins[b] || 0) + 1; const k = bins[b] - 1;
    const cx = x(b * bw), cy = H - 34 - k * 9;
    if (s.id === selShot) g += `<circle cx="${cx}" cy="${cy}" r="7.5" fill="none" stroke="var(--accent)" stroke-width="2"/>`;
    const col = s.outcome === "made" ? "var(--good)" : s.outcome === "rattled" ? "var(--warn)" : s.outcome === "missed" ? "var(--bad)" : "var(--muted)";
    if (s.outcome === "missed") g += `<path d="M${cx - 3.5} ${cy - 3.5}l7 7M${cx + 3.5} ${cy - 3.5}l-7 7" stroke="${col}" stroke-width="2.2"/>`;
    else if (s.outcome === "rattled") g += `<circle cx="${cx}" cy="${cy}" r="3.6" fill="none" stroke="${col}" stroke-width="2"/>`;
    else g += `<circle cx="${cx}" cy="${cy}" r="4" fill="${col}"/>`;
    g += `<circle class="hit" data-i="${i}" cx="${cx}" cy="${cy}" r="8" fill="transparent"/>`;
  });
  svg.setAttribute("viewBox", `0 0 ${Wd} ${H}`);
  svg.innerHTML = g;
  $("stTip").textContent = pts.length ? "Tap a dot to see that shot." : "No pocket entries marked yet. Use Mark pocket entry on the Log tab.";
  svg.onclick = e => {
    const h = e.target.closest(".hit"); if (!h) return; const s = pts[+h.dataset.i];
    if (s.result) { selShot = s.id; renderStats(); return; }
    $("stTip").textContent = `${s.drill || "Unnamed drill"} #${s.shotNo} · ${sgn(s.pocketOff, 2)}, ${fmt(s.aimErr, 2)}° · ${label(OUTCOME, s.outcome) || "no result"}`;
  };
}
const label = (list, k) => { const r = list.find(x => String(x[0]) === String(k)); return r ? r[1] : ""; };
