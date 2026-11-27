// Taps, keys and drags wired to the functions above.
/* ---------- events ---------- */
document.addEventListener("click", async e => {
  const t = e.target.closest("button"); if (!t) return;
  if (t.dataset.view) return setView(t.dataset.view);
  if (t.dataset.mode) { setMode(t.dataset.mode); renderLog(); return; }
  if (t.dataset.simkind) { setSimKind(t.dataset.simkind); return; }
  if (t.dataset.simq) { simQuick(t.dataset.simq); return; }
  if (t.dataset.vside) { settings.speedSide = Object.assign({}, settings.speedSide, { [tabKey()]: t.dataset.vside }); saveSettings(); applySpeedSide(); return; }
  if (t.dataset.smode) { statsMode = t.dataset.smode; renderStats(); return; }
  if (t.dataset.rack && playMode()) { playRack(t.dataset.rack); return; }
  if (t.dataset.play) { playAction(t.dataset.play); return; }
  if (t.id === "vcue") { openCueSheet(); return; }
  if (t.id === "cueDone") { closeCueSheet(); return; }
  if (t.dataset.cuefor) { cueFor = +t.dataset.cuefor; renderCueSheet(); return; }
  if (t.dataset.cue) { setCueLook(cueFor, t.dataset.cue, t.dataset.v); renderCueSheet(); renderCueSide(); renderTable(); return; }
  if (t.dataset.choice) { playChoose(t.dataset.choice); return; }
  if (t.dataset.callball) { setCall({ ball: +t.dataset.callball }); return; }
  if (t.dataset.callpk) { setCall({ pocket: t.dataset.callpk }); return; }
  if (t.dataset.callsafe) { setCall({ safety: true }); return; }
  if (t.dataset.callauto) { setCall({ auto: true }); return; }
  if (t.dataset.paths) { settings.playPaths = t.dataset.paths; saveSettings(); renderTable(); renderPlayInfo(); return; }
  if (t.dataset.brkfrom) { settings.playBreak = t.dataset.brkfrom; saveSettings(); const g = S.game; if (g && g.inHand === "break" && g.cb) { const q = placeCb(g, g.cb); if (q) g.cb = q; g.aim = defaultAim(g); } saveWork(); renderTable(); renderPlayInfo(); return; }
  if (t.dataset.rack) { S.rack = t.dataset.rack; saveWork(); renderLog(); return; }
  if (t.dataset.bpk) { S.pocket = t.dataset.bpk; S.rail = null; saveWork(); renderLog(); return; }
  if (t.dataset.sec) {
    const k = t.dataset.sec, cur = S.scratch ? "scratch" : S.result ? sectionOf(S.result) : S.cbSec;
    if (cur === k) { S.scratch = false; S.cbSec = null; S.result = null; }                 // tap again to clear
    else { S.scratch = k === "scratch"; S.cbSec = k; if (S.result && sectionOf(S.result) !== k) S.result = null; }
    saveWork(); renderLog(); return;
  }
  if (t.dataset.bf) { BF[t.dataset.bf] = t.dataset.v; renderStats(); return; }
  if (t.dataset.bpick) { selBrk = selBrk === t.dataset.bpick ? null : t.dataset.bpick; renderStats(); return; }
  if (t.dataset.action === "brkExamples") return addBreakExamples();
  if (t.dataset.tool) { S.tool = t.dataset.tool; saveWork(); renderTools(); renderTable(); return; }
  if (t.dataset.bk) { BK = t.dataset.bk; renderStats(); return; }
  if (t.dataset.f) { F.vspin = t.dataset.f; renderStats(); return; }
  if (t.dataset.pick) { selShot = selShot === t.dataset.pick ? null : t.dataset.pick; renderStats(); return; }
  if (t.id === "shotAll") { selShot = null; renderStats(); return; }
  if (t.id === "shotPrev" || t.id === "shotNext") {
    const ids = filtered().filter(s => s.result).map(s => s.id); if (!ids.length) return;
    const i = ids.indexOf(selShot); const d = t.id === "shotNext" ? 1 : -1;
    selShot = i < 0 ? (d > 0 ? ids[0] : ids[ids.length - 1]) : ids[(i + d + ids.length) % ids.length];
    renderStats(); return;
  }
  if (t.dataset.tz) { S.tz = t.dataset.tz; saveWork(); renderTools(); renderTable(); return; }
  if (t.dataset.themeSet) { settings.theme = t.dataset.themeSet; saveSettings(); applyAppearance(); renderSettings(); return; }
  if (t.dataset.units) { settings.units = t.dataset.units; saveSettings(); renderSettings(); return; }
  if (t.dataset.sw) { setColor(t.dataset.sw, t.dataset.hex, true); renderSettings(); return; }
  if (t.id === "resetColors") { Object.assign(settings, COLOR_DEFAULTS); saveSettings(); applyAppearance(); renderSettings(); return; }
  if (t.id === "tipCentre" || t.id === "tipCentre2") { setTip(0, 0); saveWork(); return; }
  if (t.id === "spinDone") { $("spinSheet").hidden = true; saveWork(); return; }
  if (t.dataset.g) { settings.grid = t.dataset.g; saveSettings(); buildTable(); renderSettings(); return; }
  if (t.dataset.action === "examples" || t.id === "loadEx") return addExamples();
  if (t.dataset.qs) return quickSave(t.dataset.qs);
  if (t.dataset.row) { openShot = openShot === t.dataset.row ? null : t.dataset.row; pendingDel = null; renderShots(); const b = document.querySelector(`[data-row="${CSS.escape(t.dataset.row)}"]`); if (b) b.focus(); return; }
  if (t.dataset.show) return showShotInStats(t.dataset.show);
  if (t.dataset.del) {
    const id = t.dataset.del;
    if (pendingDel === id) { pendingDel = null; openShot = null; const ok = await store.remove(id); renderShots(); if (ok) toast("Shot deleted"); }
    else { pendingDel = id; clearTimeout(pendingT); pendingT = setTimeout(() => { pendingDel = null; renderAll(); }, 3500); renderShots(); }
    return;
  }
  if (t.dataset.deldrill) {
    const id = t.dataset.deldrill;
    if (pendingDel === id) { pendingDel = null; await store.removeDrill(id); if (S.drillId === id) S.drillId = ""; renderAll(); toast("Drill deleted"); }
    else { pendingDel = id; clearTimeout(pendingT); pendingT = setTimeout(() => { pendingDel = null; renderAll(); }, 3500); renderSettings(); }
    return;
  }
  switch (t.id) {
    case "saveDrill": return showDrillForm();
    case "confirmDrill": return saveDrill();
    case "cancelDrill": return renderDrills();
    case "resetDrill": { const d = findDrill(S.drillId); if (d) { loadDrill(d); toast("Balls reset"); } return; }
    case "removeItem": S[S.tool] = null; if (S.tool === "ob") { S.entry = null; S.outcome = null; } saveWork(); renderLog(); return;
    case "newSession": S.sessionId = ""; S.lastShotTs = 0; saveWork(); renderSessionLine(); toast("Your next shot starts a new session"); return;
    case "save": S.outcome = null; return saveShot();      // the bar under the table saves with a result

    case "madeMinus": S.ballsMade = S.ballsMade == null ? 0 : Math.max(0, S.ballsMade - 1); saveWork(); renderBreakPanel(); return;
    case "madePlus": S.ballsMade = Math.min(S.rack === "10" ? 10 : S.rack === "8" ? 15 : 9, (S.ballsMade == null ? 0 : S.ballsMade) + 1); saveWork(); renderBreakPanel(); return;
    case "madeClear": S.ballsMade = null; saveWork(); renderBreakPanel(); return;
    case "railClear": S.rail = null; saveWork(); renderLog(); return;
    case "hitFull": setHit(0); saveWork(); renderPredText(); return;
    case "hitPot": { const g = ghostHit(); if (g == null) { toast("Too thin to pot from here"); return; } setHit(g, true); saveWork(); return; }
    case "undo": return undoLast();
    case "openZoom": return openZoom();
    case "zDone": closeZoom(); saveWork(); renderLog(); return;
    case "zClear": S.entry = null; renderZoom(); return;
    case "exportCsv": return exportCsv();
    case "backupSave": return exportBackup();
    case "backupCopy": return copyBackup();
    case "restorePasteToggle": $("restorePaste").hidden = !$("restorePaste").hidden; return;
    case "restoreRead": try { pendingRestore = parseBackup($("restoreText").value.trim()); } catch (err) { pendingRestore = null; toast(typeof err === "string" ? err : "Could not read that backup"); } renderSettings(); return;
    case "restoreCancel": pendingRestore = null; renderSettings(); return;
    case "restoreMerge": return applyRestore("merge");
    case "restoreReplace":
      if (pendingDel === "__restore") { pendingDel = null; return applyRestore("replace"); }
      pendingDel = "__restore"; clearTimeout(pendingT); pendingT = setTimeout(() => { pendingDel = null; renderSettings(); }, 3500); renderSettings(); return;
    case "copyCsv": return copyCsv();
    case "lblToggle": settings.labels = !settings.labels; saveSettings(); buildTable(); renderSettings(); return;
    case "clearEx": const ok = await store.removeMany(shots.filter(s => s.example).map(s => s.id)); renderAll(); if (ok) toast("Examples removed"); return;
    case "clearAll":
      if (pendingDel === "__all") { pendingDel = null; const ok = await store.removeMany(shots.map(s => s.id)); renderAll(); if (ok) toast("All shots deleted"); }
      else { pendingDel = "__all"; clearTimeout(pendingT); pendingT = setTimeout(() => { pendingDel = null; renderAll(); }, 3500); renderSettings(); }
      return;
  }
});
$("cueSheet").addEventListener("click", e => { if (e.target.id === "cueSheet") closeCueSheet(); });
$("sheet").addEventListener("click", e => { if (e.target.id === "sheet") { closeZoom(); saveWork(); renderLog(); } });
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.id === "newDrillName") { e.preventDefault(); saveDrill(); return; } if (e.key === "Escape" && !$("sheet").hidden) { closeZoom(); renderLog(); } if (e.key === "Escape" && !$("spinSheet").hidden) { $("spinSheet").hidden = true; saveWork(); } if (e.key === "Escape" && !$("cueSheet").hidden) closeCueSheet(); });
document.addEventListener("change", e => {
  if (e.target.id === "drillSel") {
    const d = findDrill(e.target.value);
    if (d) loadDrill(d); else { S.drillId = ""; S.drill = ""; saveWork(); renderLog(); }
  }
  if (e.target.id === "fDrill") { F.drill = e.target.value; renderStats(); }
  if (e.target.id === "fSession") { F.session = e.target.value; renderStats(); }
  if (e.target.id === "bfSession") { BF.session = e.target.value; renderStats(); }
  if (["sL", "sW", "sWc", "sWs"].includes(e.target.id)) applySettings();
  const id = e.target.id || "";
  if (id.startsWith("pick-")) { setColor(id.slice(5), e.target.value, false); renderSettings(); }
  if (id.startsWith("hex-")) {
    let v = e.target.value.trim(); if (/^[0-9a-f]{6}$/i.test(v)) v = "#" + v;
    if (/^#[0-9a-f]{6}$/i.test(v)) { setColor(id.slice(4), v, false); renderSettings(); } else { toast("Use a hex code like #8a9399"); renderSettings(); }
  }
});
document.addEventListener("change", e => {
  if (e.target.id === "setWake") { settings.wakeLock = e.target.checked; saveSettings(); updateWakeLock(); }
  if (e.target.id === "setHaptics") { settings.haptics = e.target.checked; saveSettings(); if (e.target.checked) buzz(); }
});
/* Stats: remember which folded panels are open, so a filter tap doesn't close them */
document.addEventListener("toggle", e => { const d = e.target; if (d && d.dataset && d.dataset.fold) foldOpen[d.dataset.fold] = d.open; }, true);
$("toast").addEventListener("click", () => { $("toast").hidden = true; clearTimeout(toastT); });
document.addEventListener("change", e => { if (e.target.id === "restoreFile" && e.target.files && e.target.files[0]) readBackupFile(e.target.files[0]); });
/* live preview while dragging in the colour wheel */
document.addEventListener("input", e => {
  const id = e.target.id || "";
  if (id.startsWith("pick-")) { const k = id.slice(5); document.documentElement.style.setProperty("--" + k, e.target.value); const h = $("hex-" + k); if (h) h.value = e.target.value; }
});
/* vertical speed bar: drag up for harder; arrow keys step 1 %, page keys 10 % */
let vsDrag = null;
const vsTrack = $("vsTrack");
const vsAt = e => { const r = vsTrack.getBoundingClientRect(); return (r.bottom - e.clientY) / r.height * 100; };
vsTrack.addEventListener("pointerdown", e => { e.preventDefault(); vsTrack.setPointerCapture(e.pointerId); vsDrag = e.pointerId; vsTrack.focus({ preventScroll: true }); setSpeed(vsAt(e)); });
vsTrack.addEventListener("pointermove", e => { if (vsDrag === e.pointerId) setSpeed(vsAt(e)); });
const vsEnd = e => { if (vsDrag === e.pointerId) vsDrag = null; };
vsTrack.addEventListener("pointerup", vsEnd); vsTrack.addEventListener("pointercancel", vsEnd);
vsTrack.addEventListener("keydown", e => {
  const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10, Home: -100, End: 100 }[e.key]; if (d == null) return;
  e.preventDefault(); setSpeed(S.speedPct + d * (e.shiftKey ? 5 : 1));
});
const cueSvg = $("cueball"), cueBig = $("cueBig");
const openSpin = () => { $("spinSheet").hidden = false; renderSpin(); };
/* Small ball: press on the blue point and drag to move it here; a tap anywhere on the ball (the point too) enlarges it. */
let smallTouch = null;
cueSvg.addEventListener("pointerdown", e => {
  e.preventDefault(); const p = cuePoint(e); if (!p) return;
  cueSvg.setPointerCapture(e.pointerId);
  const onPoint = Math.hypot(p.x - S.tip.x, p.y - S.tip.y) < .34;
  smallTouch = { id: e.pointerId, p, t: { x: S.tip.x, y: S.tip.y }, onPoint, moved: false };
});
cueSvg.addEventListener("pointermove", e => {
  const st = smallTouch; if (!st || st.id !== e.pointerId) return; const p = cuePoint(e); if (!p) return;
  if (Math.hypot(p.x - st.p.x, p.y - st.p.y) > .05) st.moved = true;
  if (st.onPoint) setTip(st.t.x + p.x - st.p.x, st.t.y + p.y - st.p.y);
});
const smallEnd = e => {
  const st = smallTouch; if (!st || st.id !== e.pointerId) return; smallTouch = null;
  if (!st.moved && e.type === "pointerup") { openSpin(); return; }   // a tap, even on the point, enlarges the ball
  if (st.onPoint) saveWork();                               // a drag that started on the point moved it here
};
cueSvg.addEventListener("pointerup", smallEnd); cueSvg.addEventListener("pointercancel", smallEnd);
$("spinSheet").addEventListener("click", e => { if (e.target.id === "spinSheet") { $("spinSheet").hidden = true; saveWork(); } });
/* Drag is relative: the point moves with the finger from wherever it lands, so the finger never hides it. */
let tipStart = null;
cueBig.addEventListener("pointerdown", e => { e.preventDefault(); cueBig.setPointerCapture(e.pointerId); tipDrag = e.pointerId; const p = cuePoint(e); if (p) tipStart = { p, t: { x: S.tip.x, y: S.tip.y } }; });
cueBig.addEventListener("pointermove", e => { if (tipDrag !== e.pointerId || !tipStart) return; const p = cuePoint(e); if (p) setTip(tipStart.t.x + p.x - tipStart.p.x, tipStart.t.y + p.y - tipStart.p.y); });
const tipEnd = e => {
  if (tipDrag !== e.pointerId) return; tipDrag = null;
  // a tap without a drag puts the point where you tapped
  const p = cuePoint(e); if (p && tipStart && Math.hypot(p.x - tipStart.p.x, p.y - tipStart.p.y) < .04) setTip(p.x, p.y);
  tipStart = null; saveWork();
};
cueBig.addEventListener("pointerup", tipEnd); cueBig.addEventListener("pointercancel", tipEnd);
cueSvg.addEventListener("keydown", e => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSpin(); return; }
  const d = { ArrowUp: [0, .05], ArrowDown: [0, -.05], ArrowLeft: [-.05, 0], ArrowRight: [.05, 0] }[e.key]; if (!d) return;
  e.preventDefault(); setTip(S.tip.x + d[0], S.tip.y + d[1]); saveWork();
});
$("drill").addEventListener("input", e => { S.drill = e.target.value; saveWork(); $("shotNo").textContent = "Shot " + (drillShots(S.drill).length + 1); renderSaveBar(); });
$("notes").addEventListener("input", e => { S.notes = e.target.value; saveWork(); });
const tbl = $("tbl");
tbl.addEventListener("pointerdown", onTableDown);
tbl.addEventListener("pointermove", onTableMove);
tbl.addEventListener("pointerup", onTableUp);
tbl.addEventListener("pointercancel", onTableUp);
const hitSvg = $("hitBall");
/* The picker is small beside the table, so a drag moves the hit by half as much as the finger (fine control) and a tap
   without a drag puts it where you tapped. */
let hitStart = null;
hitSvg.addEventListener("pointerdown", e => { e.preventDefault(); hitSvg.setPointerCapture(e.pointerId); hitDrag = e.pointerId; const h = hitFromEvent(e); hitStart = h == null ? null : { x: h, h0: S.hit || 0, moved: false }; });
hitSvg.addEventListener("pointermove", e => { if (hitDrag !== e.pointerId || !hitStart) return; const h = hitFromEvent(e); if (h == null) return; if (Math.abs(h - hitStart.x) > .03) hitStart.moved = true; if (hitStart.moved) setHit(hitStart.h0 + (h - hitStart.x) * .5); });
const hitEnd = e => { if (hitDrag === e.pointerId) { hitDrag = null; if (hitStart && !hitStart.moved && e.type === "pointerup") { const h = hitFromEvent(e); if (h != null) setHit(h); } hitStart = null; saveWork(); renderPredText(); } };
hitSvg.addEventListener("pointerup", hitEnd); hitSvg.addEventListener("pointercancel", hitEnd);
hitSvg.addEventListener("keydown", e => { const d = { ArrowLeft: -.01, ArrowRight: .01 }[e.key]; if (d == null) return; e.preventDefault(); setHit((S.hit || 0) + d); saveWork(); });
const railSvg = $("rail");
railSvg.addEventListener("pointerdown", e => { e.preventDefault(); railSvg.setPointerCapture(e.pointerId); railDrag = e.pointerId; const v = railFromEvent(e); if (v != null) setRail(v); });
railSvg.addEventListener("pointermove", e => { if (railDrag !== e.pointerId) return; const v = railFromEvent(e); if (v != null) setRail(v); });
railSvg.addEventListener("pointerup", railEnd); railSvg.addEventListener("pointercancel", railEnd);
railSvg.addEventListener("keydown", e => {
  const d = { ArrowLeft: -.1, ArrowRight: .1, ArrowDown: -1, ArrowUp: 1 }[e.key]; if (d == null) return;
  e.preventDefault(); setRail(Math.round(Math.max(-RAIL_LIM, Math.min(RAIL_LIM, (S.rail || 0) + d)) * 10) / 10); saveWork();
});
const zoom = $("zoom");
zoom.addEventListener("pointerdown", e => { e.preventDefault(); zoom.setPointerCapture(e.pointerId); zDrag = e.pointerId; const p = zoomPoint(e); if (p) setEntry(p); });
zoom.addEventListener("pointermove", e => { if (zDrag !== e.pointerId) return; const p = zoomPoint(e); if (p) setEntry(p); });
const zEnd = e => { if (zDrag === e.pointerId) zDrag = null; };
zoom.addEventListener("pointerup", zEnd); zoom.addEventListener("pointercancel", zEnd);
