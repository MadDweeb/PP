// Stats for cut breaks, and example breaks.
const BF = { session: "__all", rack: "all", pocket: "all" };
let selBrk = null;
function brkSummary(list) {
  const out = list.filter(s => s.outcome), made = out.filter(s => s.outcome === "made").length;
  const misses = list.filter(s => s.rail != null && s.outcome !== "made"), rails = misses.map(s => s.rail);
  const secs = list.map(secOf).filter(Boolean), sc = k => secs.length ? secs.filter(v => v === k).length / secs.length : null;
  const bm = list.map(s => s.ballsMade).filter(v => v != null);
  return {
    n: list.length, made: out.length ? made / out.length : null, madeN: out.length,
    long: rails.length ? rails.filter(v => v > 0).length / rails.length : null, missAvg: mean(rails), missSd: sd(rails), missN: rails.length,
    scratch: list.length ? list.filter(s => s.scratch).length / list.length : null,
    ctl: sc("centre"), up: sc("upper"), low: sc("lower"), scr: sc("scratch"), secN: secs.length, balls: mean(bm), ballsN: bm.length
  };
}
const spotBand = s => !s.cb ? null : (x => x < 12.5 ? 0 : x < 25 ? 1 : x < 37.5 ? 2 : 3)(s.cb.x / ((s.table && s.table.W) || 50) * 50);
const SPOTS = [[0, "Left of box"], [1, "Box, left half"], [2, "Box, right half"], [3, "Right of box"]];
function brkRows(list, f, cats) { return cats.map(([k, l]) => [l, brkSummary(list.filter(s => f(s) === k))]).filter(r => r[1].n); }
function brkTable(title, sub, rows) {
  const key = "b-" + title.toLowerCase().replace(/[^a-z]+/g, "-");
  return `<details class="panel fold" data-fold="${key}"${foldOpen[key] ? " open" : ""}><summary><h2>${title}</h2></summary><div class="foldbody">${sub ? `<div class="sub">${sub}</div>` : ""}<div class="scroll" tabindex="0" role="region" aria-label="Table, scrolls sideways"><table class="t"><thead><tr><th></th><th>Breaks</th><th>1-ball</th><th>Misses long</th><th>Avg miss</th><th>Scratch</th><th>CB centre</th></tr></thead><tbody>
    ${rows.map(([l, s]) => `<tr><td>${l}</td><td>${s.n}</td><td>${pct(s.made)}</td><td>${pct(s.long)}</td><td>${s.missAvg == null ? "–" : railTxt(s.missAvg)}</td><td>${pct(s.scratch)}</td><td>${pct(s.ctl)}</td></tr>`).join("") || `<tr><td colspan="7">No breaks for this filter.</td></tr>`}
  </tbody></table></div></div></details>`;
}
function renderBreakStats(v, seg) {
  const all = shots.filter(isBrk);
  if (!all.length) { v.innerHTML = seg + `<div class="empty"><strong>No breaks yet</strong><p>Pick Cut break on the Log tab to log your breaks: where the 1-ball hit the side rail, where the cue ball stopped, and scratches.</p><button class="btn" data-action="brkExamples">Try it with 20 example breaks</button></div>`; return; }
  const sess = sessions(isBrk);
  if (BF.session !== "__all" && !sess.some(x => x.id === BF.session)) BF.session = "__all";
  const keep = (s, ignoreSession) => (BF.rack === "all" || (s.rack || "9") === BF.rack) && (BF.pocket === "all" || s.pocket === BF.pocket) && (ignoreSession || BF.session === "__all" || sessionOf(s) === BF.session);
  const list = all.filter(s => keep(s)), t = brkSummary(list);
  const groups = new Map(); for (const s of all.filter(s => keep(s, true))) { const k = sessionOf(s); (groups.get(k) || groups.set(k, []).get(k)).push(s); }
  const bySess = sess.filter(x => groups.has(x.id)).map(x => [esc(sessionLabel(x.start)), brkSummary(groups.get(x.id))]);
  const chipsRow = (key, opts) => `<div class="chips">${opts.map(([k, l, ico]) => `<button class="chip sm${ico ? " rackchip" : ""}" aria-pressed="${BF[key] === k}" data-bf="${key}" data-v="${k}"${ico ? ` aria-label="${l}" title="${l}"` : ""}>${ico || l}</button>`).join("")}</div>`;
  v.innerHTML = seg + `
  <div class="filters">
    <select id="bfSession" aria-label="Session"><option value="__all">All sessions (${sess.length})</option>${sess.map(x => `<option value="${esc(x.id)}" ${BF.session === x.id ? "selected" : ""}>${esc(sessionLabel(x.start))} (${x.n})</option>`).join("")}</select>
    ${chipsRow("rack", [["all", "All racks"]].concat(RACKS.map(([k, l]) => [k, l, rackIcon(k)])))}
    ${chipsRow("pocket", [["all", "Both sides"], ["SL", "Side left"], ["SR", "Side right"]])}
  </div>
  <div class="tiles">
    <div class="tile"><span class="v">${t.n}</span><span class="k">breaks${BF.session === "__all" ? "" : " this session"}</span></div>
    <div class="tile"><span class="v">${t.made == null ? "–" : Math.round(t.made * 100)}<small>%</small></span><span class="k">1-ball made in the side (${t.madeN} with a result)</span></div>
    <div class="tile"><span class="v">${t.long == null ? "–" : Math.round(t.long * 100)}<small>%</small></span><span class="k">of misses were long (${t.missN} marked)</span></div>
    <div class="tile"><span class="v">${t.scratch == null ? "–" : Math.round(t.scratch * 100)}<small>%</small></span><span class="k">scratched</span></div>
    <div class="tile"><span class="v">${t.ctl == null ? "–" : Math.round(t.ctl * 100)}<small>%</small></span><span class="k">cue ball in the centre section (${t.secN})</span></div>
  </div>
  <div class="panel">
    <h2>Where the cue ball ended up</h2>
    <div class="sub">Sections split at the 3rd and 5th diamonds. Lower is the head end, upper the foot end.</div>
    ${secBar(t)}
  </div>
  <div class="panel">
    <h2>1-ball at the side rail</h2>
    <div class="sub">Each break where you marked the 1-ball. Short is the foot side of the pocket, long the head side. The dark band is the pocket mouth.</div>
    <svg id="brkStrip" role="img" aria-label="Where the 1-ball reached the side rail"></svg>
    <div class="legend"><span><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="var(--good)"/></svg>Made</span><span><svg width="14" height="14"><circle cx="7" cy="7" r="4.5" fill="none" stroke="var(--warn)" stroke-width="2"/></svg>Rattled out</span><span><svg width="14" height="14"><path d="M3 3l8 8M11 3l-8 8" stroke="var(--bad)" stroke-width="2.2"/></svg>Missed</span></div>
    <div class="tip" id="brkStripTip"></div>
  </div>
  <div class="panel">
    <h2>Where the cue ball finished</h2>
    <div class="sub">Breaks where you tapped the exact spot. Dashed lines mark the sections; hollow balls are where you broke from. Tap a ball for that break.</div>
    <div class="chartbox"><svg id="brkScatter" viewBox="${viewBox()}" role="img" aria-label="Cue ball finishing positions after the break"></svg></div>
    <div class="tip" id="brkScTip"></div>
  </div>
  ${brkTable("By break spot", "Across the table, seen from the head end. The box is between the outer head-rail diamonds.", brkRows(list, spotBand, SPOTS))}
  ${brkTable("By speed", "", brkRows(list, s => s.speed, SPEED))}
  ${brkTable("Session by session", "Newest first.", bySess)}
  <p class="note">Avg miss is the average distance from the pocket centre for breaks where the 1-ball didn't go in (+ long, − short). CB centre is the share of breaks with a cue ball section (scratches included) that finished in the centre section.</p>`;
  drawBrkStrip(list); drawBrkScatter(list);
}
/* one stacked bar: upper / centre / lower / scratch */
function secBar(t) {
  if (!t.secN) return `<p class="note">No cue ball finishes yet.</p>`;
  const parts = [["upper", "Upper", t.up, "var(--muted)"], ["centre", "Centre", t.ctl, "var(--good)"], ["lower", "Lower", t.low, "var(--accent)"], ["scratch", "Scratch", t.scr, "var(--bad)"]];
  const bar = parts.filter(p => p[2]).map(([k, l, v, c]) => `<div style="flex:${v};background:${c};min-width:2px" title="${l} ${pct(v)}"></div>`).join("");
  return `<div style="display:flex;height:16px;border-radius:6px;overflow:hidden;gap:2px">${bar}</div>
    <div class="legend">${parts.map(([k, l, v, c]) => `<span><svg width="12" height="12"><rect width="12" height="12" rx="3" fill="${c}"/></svg>${l} <b class="num">${pct(v)}</b></span>`).join("")}</div>`;
}
function brkLine(s) {
  return `Break ${s.shotNo} · ${s.local || ""} · ${POCKET_NAMES[s.pocket] || ""}` + (s.outcome ? `, 1-ball ${label(OUTCOME, s.outcome).toLowerCase()}` : "") +
    (s.rail != null ? ` (${railTxt(s.rail)})` : "") + (secOf(s) ? ` · cue ball ${label(CB_SECS, secOf(s)).toLowerCase()}` : "") + ` · ${speedText(s)}` + (s.notes ? ` · "${s.notes}"` : "");
}
function drawBrkStrip(list) {
  const svg = $("brkStrip"), pts = list.filter(s => s.rail != null);
  const Wd = 340, H = 130, pad = 22, lim = RAIL_LIM;
  const x = v => pad + (Math.max(-lim, Math.min(lim, v)) + lim) / (2 * lim) * (Wd - 2 * pad), half = settings.ws / 2;
  let g = `<rect x="${x(-half)}" y="14" width="${x(half) - x(-half)}" height="${H - 46}" rx="4" fill="var(--accent-soft)"/>`;
  const step = isMetric() ? 5 / 2.54 : 3;
  for (let k = -Math.floor(lim / step); k <= Math.floor(lim / step); k++) { const xi = x(k * step); g += `<line x1="${xi}" x2="${xi}" y1="14" y2="${H - 32}" stroke="var(--line)"/><text x="${xi}" y="${H - 18}" font-size="11" text-anchor="middle" fill="var(--muted)" font-family="var(--f-mono)">${k === 0 ? 0 : (k > 0 ? "+" : "−") + Math.round(toU(Math.abs(k * step)))}</text>`; }
  g += `<line x1="${x(0)}" x2="${x(0)}" y1="10" y2="${H - 32}" stroke="var(--ink)" stroke-width="1.5"/>`;
  g += `<text x="${pad}" y="${H - 3}" font-size="11" fill="var(--muted)">◀ Short</text><text x="${Wd - pad}" y="${H - 3}" font-size="11" text-anchor="end" fill="var(--muted)">Long ▶</text><text x="${Wd - 4}" y="11" font-size="12" text-anchor="end" fill="var(--muted)" font-family="var(--f-mono)">${uName()}</text>`;
  const bins = {}, bw = .5;
  pts.forEach((s, i) => {
    const b = Math.round(s.rail / bw); bins[b] = (bins[b] || 0) + 1; const k = bins[b] - 1;
    const cx = x(b * bw), cy = H - 40 - k * 9;
    const col = s.outcome === "made" ? "var(--good)" : s.outcome === "rattled" ? "var(--warn)" : s.outcome === "missed" ? "var(--bad)" : "var(--muted)";
    if (s.id === selBrk) g += `<circle cx="${cx}" cy="${cy}" r="7.5" fill="none" stroke="var(--accent)" stroke-width="2"/>`;
    if (s.outcome === "missed") g += `<path d="M${cx - 3.5} ${cy - 3.5}l7 7M${cx + 3.5} ${cy - 3.5}l-7 7" stroke="${col}" stroke-width="2.2"/>`;
    else if (s.outcome === "rattled") g += `<circle cx="${cx}" cy="${cy}" r="3.6" fill="none" stroke="${col}" stroke-width="2"/>`;
    else g += `<circle cx="${cx}" cy="${cy}" r="4" fill="${col}"/>`;
    g += `<circle class="hit" data-i="${i}" cx="${cx}" cy="${cy}" r="8" fill="transparent"/>`;
  });
  svg.setAttribute("viewBox", `0 0 ${Wd} ${H}`); svg.innerHTML = g;
  const misses = pts.filter(s => s.outcome !== "made").map(s => s.rail);
  const sum = !pts.length ? "No 1-ball positions marked yet." : misses.length ? `Misses average ${railTxt(mean(misses))}${misses.length > 1 ? `, spread ±${fls(sd(misses), 1)}` : ""}. Tap a mark for that break.` : "Every marked 1-ball went in. Tap a mark for that break.";
  $("brkStripTip").textContent = sum;
  svg.onclick = e => { const h = e.target.closest(".hit"); if (!h) { $("brkStripTip").textContent = sum; return; } const s = pts[+h.dataset.i]; selBrk = s.id; $("brkStripTip").textContent = brkLine(s); drawBrkScatter(list); };
}
function drawBrkScatter(list) {
  const svg = $("brkScatter"); svg.style.aspectRatio = aspect();
  const c = toSvg({ x: settings.W / 2, y: settings.L / 2 });
  let g = `<g>${staticTable()}</g>` + sectionLinesSvg() + breakBoxSvg();
  const pts = list.filter(s => s.result), one = selBrk ? list.find(s => s.id === selBrk) : null;
  const spots = new Map(); for (const s of list) if (s.cb) spots.set(s.cb.x + "," + s.cb.y, s.cb);
  for (const p of spots.values()) g += ballSvg(p, "cb");
  pts.forEach((s, i) => {
    const q = toSvg(s.result), on = one && one.id === s.id;
    g += `<circle cx="${q.x}" cy="${q.y}" r="${R_BALL}" fill="#fbfaf4" fill-opacity="${one && !on ? .35 : .9}" stroke="${on ? "var(--accent)" : "#111111"}" stroke-width="${on ? 3 : 1.2}" vector-effect="non-scaling-stroke"/><circle class="hit" data-i="${i}" cx="${q.x}" cy="${q.y}" r="${R_BALL * 2.2}" fill="transparent"/>`;
  });
  if (one && one.cb && one.result) g += line(one.cb, one.result, "var(--accent)", "4 3", .9);
  svg.innerHTML = `<g transform="${rotAttr()}">${g}</g>`;
  const scr = list.filter(s => s.scratch).length;
  $("brkScTip").textContent = one ? brkLine(one) : `${pts.length} finishes shown${scr ? `, plus ${scr} scratch${scr === 1 ? "" : "es"}` : ""}.`;
  svg.onclick = e => { const h = e.target.closest(".hit"); if (!h) { selBrk = null; drawBrkScatter(list); return; } selBrk = pts[+h.dataset.i].id; drawBrkScatter(list); };
}
function exampleBreaks() {
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const out = [], now0 = Date.now(), half = settings.ws / 2;
  for (let i = 0; i < 20; i++) {
    const day = i < 10 ? 1 : 0, t = new Date(now0 - day * 86400e3 - 3600e3 + i * 120e3);
    const rail = r2(1.4 - day * .8 + gauss() * 2.6), outcome = Math.abs(rail) < half - .6 ? "made" : Math.abs(rail) < half ? "rattled" : "missed";
    const scratch = rnd() < .12 ? 1 : 0, res = clampBall({ x: 25 + gauss() * 9, y: 50 + gauss() * 14 });
    out.push({ id: uid() + "b" + i, kind: "break", ts: t.toISOString(), local: t.toISOString().slice(0, 16).replace("T", " "), drill: BRK_DRILL, drillId: "", shotNo: i + 1,
      session: "ses-example-brk-" + day, rack: "9", vspin: "stun", side: "C", speed: 4, speedPct: 85 + Math.round(gauss() * 4), tip: { x: 0, y: -.1 },
      cb: { x: 37, y: 22 }, result: scratch || i % 4 === 3 ? null : { x: r2(res.x), y: r2(res.y) }, scratch, cbSec: scratch ? "scratch" : sectionOf(res), pocket: "SL", outcome, rail,
      ballsMade: (outcome === "made" ? 1 : 0) + (rnd() < .3 ? 1 : 0), notes: "", example: true, table: { W: settings.W, L: settings.L, wc: settings.wc, ws: settings.ws } });
  }
  return out;
}
async function addBreakExamples() {
  if (!(await store.addMany(exampleBreaks()))) return;
  statsMode = "break"; renderAll(); toast("Added 20 example breaks. Remove them from the Shots tab.");
}
