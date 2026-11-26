// Building, saving and undoing a shot or break record.
/* ---------- shot record ---------- */
function localStamp(now) {
  return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0") + " " + String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
}
function buildBreak() {
  const now = new Date();
  return {
    id: uid(), kind: "break", ts: now.toISOString(), local: localStamp(now),
    drill: BRK_DRILL, drillId: "", shotNo: drillShots(BRK_DRILL).length + 1, session: S.sessionId, rack: S.rack,
    vspin: S.vspin, side: S.side, speed: S.speed, speedPct: S.speedPct, tip: { x: S.tip.x, y: S.tip.y },
    cb: S.cb ? { x: r2(S.cb.x), y: r2(S.cb.y) } : null,
    result: S.scratch || !S.result ? null : { x: r2(S.result.x), y: r2(S.result.y) },
    scratch: S.scratch ? 1 : 0, cbSec: S.scratch ? "scratch" : S.result ? sectionOf(S.result) : S.cbSec || null, pocket: S.pocket, outcome: S.outcome || null,
    rail: S.rail == null ? null : r2(S.rail), ballsMade: S.ballsMade == null ? null : S.ballsMade, hit: S.hit || 0,
    predRail: pred && pred.key === JSON.stringify(predInputs()) ? pred.rail : null, predMade: pred && pred.key === JSON.stringify(predInputs()) ? (pred.made ? 1 : 0) : null,
    notes: S.notes || "", example: false,
    table: { W: settings.W, L: settings.L, wc: settings.wc, ws: settings.ws }
  };
}
function buildShot() {
  if (brkMode()) return buildBreak();
  const P = pockets(); const pk = P[S.pocket];
  const off = pocketOffset(S.entry, pk, S.ob);
  const errV = S.target && S.result ? sub(S.result, S.target) : null;
  const now = new Date();
  return {
    id: uid(), ts: now.toISOString(),
    local: now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0") + " " + String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0"),
    drill: S.drill || "", drillId: S.drillId || "", shotNo: drillShots(S.drill).length + 1,
    session: S.sessionId, tz: S.target ? (S.tz || "point") : null,
    inZone: (() => { const z = zoneShape(S.target, S.tz); return z ? (inZone(S.result, z) ? 1 : 0) : null; })(),
    vspin: S.vspin, side: S.side, speed: S.speed, speedPct: S.speedPct, tip: { x: S.tip.x, y: S.tip.y },
    cb: S.cb ? { x: r2(S.cb.x), y: r2(S.cb.y) } : null,
    ob: S.ob ? { x: r2(S.ob.x), y: r2(S.ob.y) } : null,
    target: S.target ? { x: r2(S.target.x), y: r2(S.target.y) } : null,
    result: { x: r2(S.result.x), y: r2(S.result.y) },
    entry: S.entry && S.ob ? { x: r2(S.entry.x), y: r2(S.entry.y) } : null,
    outcome: S.ob ? (S.outcome || null) : null,
    cut: S.cb && S.ob ? r2(cutAngle(S.cb, S.ob, pk)) : null,
    obDist: S.ob ? r2(len(sub(pk.c, S.ob))) : null,
    cbErr: errV ? r2(len(errV)) : null, cbDx: errV ? r2(errV.x) : null, cbDy: errV ? r2(errV.y) : null,
    pocket: S.ob ? S.pocket : "", pocketOff: off == null || !S.ob ? null : r2(off), aimErr: off == null ? null : r2(aimErrorDeg(off, pk, S.ob)),
    notes: S.notes || "", example: false,
    table: { W: settings.W, L: settings.L, wc: settings.wc, ws: settings.ws }
  };
}
async function saveShot() {
  if (!canSave()) { toast(brkMode() ? "Mark where the cue ball stopped, or tap Scratch" : "Mark where the cue ball stopped first"); return; }
  const nowMs = Date.now();
  if (!currentSessionActive()) { S.sessionId = "ses-" + nowMs.toString(36); S.sessionStart = new Date(nowMs).toISOString(); }
  S.lastShotTs = nowMs;
  const s = buildShot();
  if (!(await store.add(s))) { saveWork(); renderAll(); return; }     // not saved: keep the markers so nothing is lost
  S.result = null; S.entry = null; S.outcome = null; S.notes = ""; S.tool = "result";
  S.rail = null; S.scratch = false; S.cbSec = null; S.ballsMade = null;
  saveWork(); renderAll(); buzz();
  if (!land) { try { $("tablewrap").scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); } catch (e) {} }
  if (isBrk(s)) { toast(`Break ${s.shotNo} saved` + (s.cbSec ? `, cue ball ${label(CB_SECS, s.cbSec).toLowerCase()}` : "") + (s.outcome ? `, 1-ball ${label(OUTCOME, s.outcome).toLowerCase()}` : "") + (s.rail != null && s.outcome !== "made" ? ` ${railTxt(s.rail)}` : "")); return; }
  toast(`Shot ${s.shotNo} saved` + (s.inZone === 1 ? ", in the zone" : s.inZone === 0 ? ", outside the zone" : s.cbErr != null ? `, ${fls(s.cbErr, 1)} from target` : ""));
}
async function undoLast() {
  const list = drillShots(S.drill); if (!list.length) return;
  const last = list[list.length - 1];
  if (!(await store.remove(last.id))) return;
  if (isBrk(last)) {
    S.result = last.result; S.scratch = !!last.scratch; S.cbSec = last.result ? null : last.cbSec || null; S.outcome = last.outcome; S.rail = last.rail; S.ballsMade = last.ballsMade; S.notes = last.notes || "";
    if (last.cb) S.cb = last.cb; S.pocket = last.pocket; S.rack = last.rack || S.rack; S.hit = last.hit || 0;
    S.tip = last.tip || S.tip; S.vspin = vspinOf(S.tip); S.side = sideOf(S.tip); S.speedPct = last.speedPct != null ? last.speedPct : S.speedPct; S.speed = speedOf(S.speedPct);
    saveWork(); renderAll(); toast(`Break ${last.shotNo} removed. Its markers are back.`); return;
  }
  S.result = last.result; S.entry = last.entry; S.outcome = last.outcome; S.notes = last.notes || "";
  if (last.cb) S.cb = last.cb; S.ob = last.ob || null; S.target = last.target; if (last.pocket) S.pocket = last.pocket;
  S.tip = last.tip || tipFromLabels(last.vspin, last.side); S.vspin = vspinOf(S.tip); S.side = sideOf(S.tip);
  S.speedPct = last.speedPct != null ? last.speedPct : pctFromSpeed(last.speed); S.speed = speedOf(S.speedPct);
  saveWork(); renderAll(); toast(`Shot ${last.shotNo} removed. Its markers are back on the table.`);
}
