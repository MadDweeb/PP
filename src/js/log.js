// The Log tab: tools, drills, sessions, rearrangeable sections, quick log, cue ball spin picker and speed bar.
/* ---------- rendering: log ---------- */
const ICONS = {
  cb: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#fbfaf4" fill-opacity=".6" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 2"/></svg>`,
  ob: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#f2b705" stroke="#5c4300" stroke-width="1.4"/></svg>`,
  target: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="3 2"/><path d="M3 12h18M12 3v18" stroke="var(--accent)" stroke-width="1.4"/></svg>`,
  result: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#fbfaf4" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.6" fill="#c23b2e"/></svg>`
};
const TOOLS_SIM = [["cb", "Cue ball"], ["ob", "Object ball"], ["target", "Target"]];
const HINTS_SIM = { cb: "Tap or drag to place the cue ball. Tap a pocket to aim the object ball at it.", ob: "Tap or drag to place the object ball. Tap a pocket to aim at it.", target: "Tap where you want the cue ball to finish." };
const TOOLS_SIMB = [["cb", "Break spot"]];
const HINTS_SIMB = { cb: "Tap or drag the cue ball anywhere behind the head string. The white box is the break box." };
function renderTools() {
  if (simMode()) {
    const b = simBrk(), list = b ? TOOLS_SIMB : TOOLS_SIM;
    if (!list.some(([k]) => k === S.tool)) S.tool = "cb";
    $("tools").style.gridTemplateColumns = `repeat(${list.length}, 1fr)`;
    $("tools").innerHTML = list.map(([k, lbl]) => `<button class="tool" aria-pressed="${S.tool === k}" data-tool="${k}">${ICONS[k]}<span>${lbl}</span><span class="set num">${S[k] ? zone(S[k], 4, 8) : "none"}</span></button>`).join("");
    $("hint").textContent = (b ? HINTS_SIMB : HINTS_SIM)[S.tool];
    const rm = $("removeItem"), can = !b && S.tool === "ob" && S.ob;
    rm.hidden = !can; if (can) rm.textContent = "Remove object ball";
    $("zoneChips").hidden = true;
    return;
  }
  const bm = brkMode();
  if (bm && S.tool !== "cb" && S.tool !== "result") S.tool = "result";
  $("tools").style.gridTemplateColumns = bm ? "repeat(2, 1fr)" : "";
  $("tools").innerHTML = (bm ? TOOLS_BRK : TOOLS).map(([k, lbl]) => {
    const set = bm && k === "result" && !S.result && S.cbSec ? label(CB_SECS, S.cbSec).toLowerCase() : S[k] ? zone(S[k], 4, 8) : (k === "target" || k === "ob" ? "none" : "not set");
    return `<button class="tool" aria-pressed="${S.tool === k}" data-tool="${k}">${ICONS[k]}<span>${lbl}</span><span class="set num">${set}</span></button>`;
  }).join("");
  $("hint").textContent = (bm ? HINTS_BRK : HINTS)[S.tool];
  const rm = $("removeItem"); const can = (S.tool === "ob" || S.tool === "target") && S[S.tool];
  rm.hidden = !can; if (can) rm.textContent = S.tool === "ob" ? "Remove object ball" : "Remove target";
  const zc = $("zoneChips"); zc.hidden = !(S.tool === "target" && S.target);
  zc.innerHTML = ZONES.map(([k]) => `<button class="chip sm" aria-pressed="${(S.tz || "point") === k}" data-tz="${k}">${zoneName(k)}</button>`).join("");
}
function chips(el, list, cur, key, extraCls) {
  $(el).innerHTML = list.map(([k, lbl, cls]) => `<button class="chip ${cls || ""}" aria-pressed="${String(cur) === String(k)}" data-key="${key}" data-k="${k}">${lbl}</button>`).join("");
}
function drillShots(name) { return shots.filter(s => (s.drill || "") === (name || "")); }
function renderDrills() {
  const sel = $("drillSel"); const opt = d => `<option value="${esc(d.id)}" ${S.drillId === d.id ? "selected" : ""}>${esc(d.name)}</option>`;
  sel.innerHTML = `<option value="" ${!S.drillId ? "selected" : ""}>Free practice</option><optgroup label="Starter drills">${STARTER.map(opt).join("")}</optgroup>` +
    (myDrills.length ? `<optgroup label="My drills">${myDrills.map(opt).join("")}</optgroup>` : "");
  const d = S.drillId ? findDrill(S.drillId) : null;
  if (S.drillId && !d) S.drillId = "";
  $("freeRow").hidden = !!d;
  const info = $("drillInfo"); info.hidden = !d;
  if (d) info.innerHTML = `<p>${esc(d.desc || "Your saved setup.")}</p><button class="btn small" id="resetDrill">Reset balls</button>`;
}
function loadDrill(d) {
  S.drillId = d.id; S.drill = d.name;
  S.cb = d.cb ? Object.assign({}, d.cb) : null; S.ob = d.ob ? Object.assign({}, d.ob) : null; S.target = d.target ? Object.assign({}, d.target) : null;
  S.tz = d.tz || "point";
  if (d.pocket) S.pocket = d.pocket;
  S.tip = d.tip ? Object.assign({}, d.tip) : tipFromLabels(d.vspin, d.side); S.vspin = vspinOf(S.tip); S.side = sideOf(S.tip);
  S.speedPct = d.speedPct != null ? d.speedPct : pctFromSpeed(d.speed); S.speed = speedOf(S.speedPct);
  S.result = null; S.entry = null; S.outcome = null; S.tool = "result";
  saveWork(); renderLog();
}
function showDrillForm() {
  const info = $("drillInfo"); info.hidden = false;
  info.innerHTML = `<div class="drillform" style="flex:1"><input id="newDrillName" placeholder="Drill name" value="${esc(S.drill)}" aria-label="Drill name"><button class="btn primary small" id="confirmDrill">Save drill</button><button class="btn small" id="cancelDrill">Cancel</button></div>`;
  $("newDrillName").focus();
}
async function saveDrill() {
  const name = ($("newDrillName").value || "").trim();
  if (!name) { toast("Give the drill a name"); return; }
  const d = { id: "u-" + uid(), name, desc: "", cb: S.cb, ob: S.ob, target: S.target, tz: S.tz || "point", pocket: S.pocket, vspin: S.vspin, side: S.side, speed: S.speed, tip: S.tip, speedPct: S.speedPct };
  await store.addDrill(clean(d)); S.drillId = d.id; S.drill = name; saveWork(); renderLog(); toast(`Saved drill "${name}"`);
}
function currentSessionActive() { return S.sessionId && Date.now() - (S.lastShotTs || 0) <= SESSION_GAP_MS; }
function renderSessionLine() {
  const el = $("sessionText");
  if (currentSessionActive()) {
    const n = shots.filter(s => s.session === S.sessionId).length;
    el.textContent = `Session from ${sessionLabel(S.sessionStart)} · ${n} shot${n === 1 ? "" : "s"}`;
  } else el.textContent = "Your next shot starts a new session.";
  $("newSession").hidden = !currentSessionActive();
}
/* ---------- log sections: order per mode, rearrangeable, saved in settings ---------- */
const CARD_ORDER = {
  shot: ["marks", "pocket", "result", "tip", "note"],
  break: ["tip", "hit", "pred", "marks", "rail", "cbfin", "balls", "rack", "tune", "note"],
  sim: ["tip", "hit", "simres", "simset", "marks", "tune"]
};
let arranging = false;
function cardOrder(m) {
  const def = CARD_ORDER[m], saved = (settings.cardOrder && settings.cardOrder[m]) || [];
  const o = saved.filter(k => def.includes(k));
  for (const k of def) if (!o.includes(k)) o.splice(Math.min(def.indexOf(k), o.length), 0, k);   // new sections slot in near their default place
  return o;
}
const tabKey = () => S.mode === "break" || S.mode === "sim" ? S.mode : "shot";
function renderCards() {
  const m = tabKey(), box = $("cards"), order = cardOrder(m);
  const tags = m === "sim" ? ["sim", "sim" + S.simKind] : [m];
  for (const el of box.querySelectorAll(".card")) {
    const only = el.dataset.only;
    el.hidden = !!only && !only.split(" ").some(t => tags.includes(t));
  }
  if (m === "sim" && S.simKind === "shot" && !S.ob) box.querySelector('[data-card="hit"]').hidden = true;   // no object ball, nothing to hit
  order.forEach((k, i) => {
    const el = box.querySelector(`[data-card="${k}"]`); if (!el) return;
    box.appendChild(el);
    const name = el.querySelector("h3").textContent;
    el.querySelector(".mv").innerHTML = `<button class="btn" data-mv="${k}" data-dir="-1" aria-label="Move ${esc(name)} up" ${i === 0 ? "disabled" : ""}>↑</button><button class="btn" data-mv="${k}" data-dir="1" aria-label="Move ${esc(name)} down" ${i === order.length - 1 ? "disabled" : ""}>↓</button>`;
  });
  box.classList.toggle("arranging", arranging);
  box.classList.toggle("brk", m !== "shot");
  applySpeedSide();
  $("arrange").textContent = arranging ? "Done" : "Rearrange sections";
  $("arrange").setAttribute("aria-pressed", arranging);
  $("arrangeReset").hidden = !arranging; $("sideCtl").hidden = !arranging;
  updatePin();
}
function moveCard(k, dir) {
  const m = tabKey(), o = cardOrder(m), i = o.indexOf(k), j = i + dir;
  if (i < 0 || j < 0 || j >= o.length) return;
  [o[i], o[j]] = [o[j], o[i]];
  settings.cardOrder = Object.assign({}, settings.cardOrder, { [m]: o }); saveSettings();
  renderCards();
  const b = document.querySelector(`[data-mv="${k}"][data-dir="${dir}"]`); if (b && !b.disabled) b.focus();
}
/* Pin table (portrait, cut break): the table shrinks and stays on screen while the sections scroll under it */
/* the vertical speed bar sits on the right of the table unless you move it; each tab remembers its side */
const speedSide = () => (settings.speedSide && settings.speedSide[tabKey()]) || "right";
function applySpeedSide() {
  $("tablewrap").classList.toggle("vsleft", speedSide() === "left");
  for (const b of document.querySelectorAll("[data-vside]")) b.setAttribute("aria-pressed", b.dataset.vside === speedSide());
}
function updatePin() {
  const on = (brkMode() || simMode()) && settings.pinTable !== false && !arranging;   // unpinned while rearranging, so the whole list is in view
  document.body.classList.toggle("pin", on);
  const btn = $("pinTable"); btn.hidden = !(brkMode() || simMode()) || land; btn.setAttribute("aria-pressed", on); btn.textContent = on ? "Unpin table" : "Pin table";
  if (!on || land) return;
  const top = document.querySelector(".top"), a = document.querySelector(".colA"), tw = $("tablewrap");
  const headH = top.getBoundingClientRect().height + (parseFloat(getComputedStyle(top).top) || 0);
  a.style.setProperty("--pinTop", (headH - (tw.getBoundingClientRect().top - a.getBoundingClientRect().top) - 2) + "px");
}
$("pinTable").addEventListener("click", () => { settings.pinTable = settings.pinTable === false; saveSettings(); updatePin(); });
addEventListener("resize", () => { if (brkMode() || simMode()) updatePin(); });
$("arrange").addEventListener("click", () => { arranging = !arranging; renderCards(); });
$("arrangeReset").addEventListener("click", () => {
  const m = tabKey();
  if (settings.cardOrder) { delete settings.cardOrder[m]; saveSettings(); }
  if (settings.speedSide) { delete settings.speedSide[m]; saveSettings(); }
  renderCards();
});
$("cards").addEventListener("click", e => {
  const b = e.target.closest("[data-mv]"); if (!b) return;
  moveCard(b.dataset.mv, +b.dataset.dir);
});
function renderLog() {
  const bm = brkMode(), sm = simMode();
  $("modeShot").setAttribute("aria-selected", !bm && !sm); $("modeBreak").setAttribute("aria-selected", bm); $("modeSim").setAttribute("aria-selected", sm);
  $("drillSel").hidden = bm || sm; $("brkTitle").hidden = !bm && !sm; $("brkTitle").textContent = sm ? "Simulator" : "Cut break";
  $("shotNo").hidden = sm;
  document.querySelector(".sessionline").hidden = sm; document.querySelector(".savebar").hidden = sm;
  renderCards();
  $("save").textContent = bm ? "Save break" : "Save shot";
  $("notesLbl").textContent = bm ? "Note for this break" : "Note for this shot";
  renderDrills(); if (bm || sm) { $("freeRow").hidden = true; $("drillInfo").hidden = true; }
  renderSessionLine();
  updatePin();
  $("drill").value = S.drill || "";
  $("notes").value = S.notes || "";
  $("shotNo").textContent = (bm ? "Break " : "Shot ") + (drillShots(S.drill).length + 1);
  renderTable(); renderTools();
  if (bm) renderBreakPanel();
  if (sm) renderSimPanel();
  const P = pockets(); const pk = P[S.pocket];
  const off = pocketOffset(S.entry, pk, S.ob);
  const cut = cutAngle(S.cb, S.ob, pk);
  $("openZoom").hidden = !S.ob;
  document.querySelector('[data-card="result"]').hidden = bm || sm || !S.ob;
  if (!S.ob) $("pocketWhat").innerHTML = `<b>Position only</b><br><span style="font-size:12px;color:var(--muted)">No object ball on the table. Pick Object ball and tap to add one.</span>`;
  else $("pocketWhat").innerHTML = `<b>${esc(POCKET_NAMES[S.pocket])}</b><br><span class="num" style="font-size:12px;color:var(--muted)">${cut == null ? "" : "cut " + fmt(Math.abs(cut), 0) + "°" + (Math.abs(cut) < .5 ? "" : cut > 0 ? " right" : " left") + " · "}${S.entry ? "entry " + sgn(off, 2) : "entry not marked"}</span>`;
  chips("outcomeChips", OUTCOME, S.outcome, "outcome");
  renderSpin(); renderSpeed();
  $("save").disabled = !canSave();
  renderQuick();
  $("undo").disabled = !drillShots(S.drill).length;
}

/* ---------- quick log ---------- */
let quickBusy = false;
function renderQuick() {
  const q = $("quickbar");
  if (simMode()) {
    const b = simBrk(), playing = !!simAnim, running = sum50 && sum50.done < sum50.n;
    q.innerHTML = `<button class="qs good" data-simq="shoot">${playing ? "Stop" : b ? "Break" : "Shoot"}<small>${playing ? "stop the replay" : "play it in real time"}</small></button>` +
      (b ? `<button class="qs plain" data-simq="run50">${running ? "Cancel" : "Run 50"}<small>${running ? sum50.done + " of 50 done" : "random racks, real-stroke wobble"}</small></button>` : "") +
      `<button class="qs plain" data-simq="paths" aria-pressed="${S.simPaths !== false}">${S.simPaths !== false ? "Hide paths" : "Show paths"}<small>dashed lines</small></button>`;
    return;
  }
  if (brkMode()) {
    if (!canSave()) { q.innerHTML = `<div class="qmsg">Tap where the cue ball stopped, or pick its section, then tap the 1-ball result here to save</div>`; return; }
    q.innerHTML = OUTCOME.map(([k, lbl, cls]) => `<button class="qs ${cls}" data-qs="${k}" ${quickBusy ? "disabled" : ""}>1-ball ${lbl.toLowerCase()}<small>save break</small></button>`).join("");
    return;
  }
  if (!S.result) { q.innerHTML = `<div class="qmsg">Tap where the cue ball stopped, then tap a result here to save</div>`; return; }
  q.innerHTML = S.ob
    ? OUTCOME.map(([k, lbl, cls]) => `<button class="qs ${cls}" data-qs="${k}" ${quickBusy ? "disabled" : ""}>${lbl}<small>save shot</small></button>`).join("")
    : `<button class="qs plain" data-qs="none" ${quickBusy ? "disabled" : ""}>Save shot<small>position only</small></button>`;
}
const canSave = () => brkMode() ? !!(S.result || S.scratch || S.cbSec) : !!S.result;
async function quickSave(k) {
  if (quickBusy || !canSave()) return;
  quickBusy = true; renderQuick();
  try { if (k !== "none") S.outcome = k; await saveShot(); }
  finally { quickBusy = false; renderQuick(); }
}

/* ---------- spin: cue ball picker ---------- */
const CB_STATIC = `<defs><radialGradient id="cbShade" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".65" stop-color="#eeece4"/><stop offset="1" stop-color="#c9c6bc"/></radialGradient></defs>
  <circle r="1" fill="url(#cbShade)" stroke="#8d8a82" stroke-width=".02"/>
  <g stroke="#3b4148" stroke-opacity=".22" stroke-width=".012" fill="none">
    <line x1="-1" y1="${-TIP_STUN}" x2="1" y2="${-TIP_STUN}" stroke-dasharray=".04 .04"/><line x1="-1" y1="${TIP_STUN}" x2="1" y2="${TIP_STUN}" stroke-dasharray=".04 .04"/>
    <line x1="-1" y1="${-TIP_FULL}" x2="1" y2="${-TIP_FULL}"/><line x1="-1" y1="${TIP_FULL}" x2="1" y2="${TIP_FULL}"/>
    <line x1="${-TIP_SIDE}" y1="-1" x2="${-TIP_SIDE}" y2="1" stroke-dasharray=".04 .04"/><line x1="${TIP_SIDE}" y1="-1" x2="${TIP_SIDE}" y2="1" stroke-dasharray=".04 .04"/>
  </g>
  <circle r="${TIP_MISCUE}" fill="none" stroke="#c23b2e" stroke-opacity=".45" stroke-width=".016" stroke-dasharray=".05 .04"/>
  <path d="M-.07 0h.14M0 -.07v.14" stroke="#3b4148" stroke-opacity=".6" stroke-width=".018"/>
  <g font-family="var(--f-body)" font-size=".13" font-weight="600" fill="#3b4148" fill-opacity=".5" text-anchor="middle" dominant-baseline="central">
    <text y="-.78">FOLLOW</text><text y=".78">DRAW</text><text x="-.8" y="0">L</text><text x=".8" y="0">R</text>
  </g>`;
let tipDrag = null;
function renderSpin() {
  const t = S.tip, svg = $("cueball");
  for (const [id, dyn, gid] of [["cueball", "cbDyn", "a"], ["cueBig", "cbDynBig", "b"]]) { const el = $(id); if (!el.firstChild) el.innerHTML = CB_STATIC.replace(/cbShade/g, "cbShade" + gid) + `<g id="${dyn}"></g>`; }
  const r = Math.hypot(t.x, t.y);
  $("cbDyn").innerHTML = $("cbDynBig").innerHTML = (r > .02 ? `<line x1="0" y1="0" x2="${t.x}" y2="${-t.y}" stroke="var(--accent)" stroke-width=".02" stroke-opacity=".8"/>` : "") +
    `<circle cx="${t.x}" cy="${-t.y}" r=".23" fill="var(--accent)" fill-opacity=".28" stroke="var(--accent)" stroke-width=".03"/><circle cx="${t.x}" cy="${-t.y}" r=".045" fill="var(--accent)"/>`;
  $("spinName").textContent = label(VSPIN, S.vspin) + " · " + (S.side === "C" ? "no side" : label(SIDE, S.side).toLowerCase());
  const up = t.y, rt = t.x;
  $("spinOff").innerHTML = r < .005 ? "Dead centre" : `<b>${tipLen(r)}</b> from centre<br>${Math.abs(up) >= .005 ? tipLen(Math.abs(up)) + (up > 0 ? " up" : " down") : ""}${Math.abs(up) >= .005 && Math.abs(rt) >= .005 ? ", " : ""}${Math.abs(rt) >= .005 ? tipLen(Math.abs(rt)) + (rt > 0 ? " right" : " left") : ""}`;
  $("spinWarn").textContent = r > TIP_MISCUE ? "Past the miscue limit (red ring)" : "";
  $("bigName").textContent = $("spinName").textContent; $("bigOff").innerHTML = $("spinOff").innerHTML; $("bigWarn").textContent = $("spinWarn").textContent;
  svg.setAttribute("aria-valuetext", $("spinName").textContent + ", " + tipLen(r) + " from centre");
}
function setTip(x, y) {
  const snap = v => Math.abs(v) < .03 ? 0 : v;
  x = snap(x); y = snap(y); const r = Math.hypot(x, y);
  if (r > TIP_MAX) { x *= TIP_MAX / r; y *= TIP_MAX / r; }
  S.tip = { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
  S.vspin = vspinOf(S.tip); S.side = sideOf(S.tip); renderSpin();
  if (brkMode()) { renderTable(); renderPredText(); }
  if (simMode()) { simStopAnim(); renderTable(); renderSimRes(); }
}
function cuePoint(e) {
  const svg = e.currentTarget && e.currentTarget.id === "cueball" ? $("cueball") : $("cueBig"), pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  const m = svg.getScreenCTM(); if (!m) return null; const q = pt.matrixTransform(m.inverse()); return { x: q.x, y: -q.y };
}
function renderSpeed() {
  const p = S.speedPct, sp = speedOf(p), t = $("vsTrack");
  $("vsThumb").style.bottom = p + "%"; $("vsDim").style.height = (100 - p) + "%";
  $("vsPct").textContent = p + "%"; $("vsWord").textContent = label(SPEED, sp).toLowerCase();
  t.setAttribute("aria-valuenow", p); t.setAttribute("aria-valuetext", p + "%, " + label(SPEED, sp));
}
function setSpeed(p) {
  p = Math.max(0, Math.min(100, Math.round(p)));
  if (p === S.speedPct) return;
  S.speedPct = p; S.speed = speedOf(p); renderSpeed(); saveWork();
  if (brkMode()) { renderTable(); renderPredText(); }
  if (simMode()) { simStopAnim(); renderTable(); renderSimRes(); }
}
