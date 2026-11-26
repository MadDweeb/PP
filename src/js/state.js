// App state: settings, the shot being set up (S), Log modes, shots and drills, and the store that saves them.
const settings = Object.assign({ W: 50, L: 100, wc: 4.25, ws: 4.75, grid: "8x4", labels: false, theme: "system", units: "imperial" }, COLOR_DEFAULTS, ls.get(LS.settings, {}));
const S = Object.assign({
  drill: "", drillId: "", tz: "point", sessionId: "", sessionStart: "", lastShotTs: 0, vspin: "stun", side: "C", speed: 2, pocket: "FR", tool: "result",
  cb: { x: 20, y: 52 }, ob: { x: 40, y: 82 }, target: { x: 30, y: 70 }, result: null, entry: null, outcome: null, notes: ""
}, ls.get(LS.work, {}));
if (!S.tip) S.tip = tipFromLabels(S.vspin, S.side);
if (S.speedPct == null) S.speedPct = pctFromSpeed(S.speed);
if (!S.stash || typeof S.stash !== "object") S.stash = {};
if (!S.rack) S.rack = "9";
if (typeof S.hit !== "number") S.hit = 0;      // 1-ball hit: cue ball centre line offset from the 1-ball centre, in ball widths; + = hitting its right side
if (S.mode !== "break" && S.mode !== "sim") S.mode = "shot";
if (S.simKind !== "break") S.simKind = "shot";
/* Simulator starting layouts: the same starter drills as the shot log. x from the left cushion, y from the head cushion (inches). */
const SIM_DIAG = t => ({ x: 50 * t, y: 100 * t });
const SIM_PRESETS = [
  { name: "Stop shot, straight in", cb: SIM_DIAG(.5), ob: SIM_DIAG(.75), target: { x: 36.99, y: 73.99 }, pocket: "FR", tip: { x: 0, y: -.5 }, speed: 36 },
  { name: "Stun-follow 1 ft, straight in", cb: SIM_DIAG(.5), ob: SIM_DIAG(.75), target: { x: 42.36, y: 84.72 }, pocket: "FR", tip: { x: 0, y: -.25 }, speed: 35 },
  { name: "Draw back 2 ft, straight in", cb: SIM_DIAG(.4), ob: SIM_DIAG(.75), target: { x: 26.26, y: 52.52 }, pocket: "FR", tip: { x: 0, y: -.5 }, speed: 49 },
  { name: "Stun along the tangent line", cb: { x: 40.3, y: 52 }, ob: { x: 40, y: 82 }, target: { x: 21.2, y: 89.2 }, pocket: "FR", tip: { x: 0, y: -.35 }, speed: 53 },
  { name: "Follow to the foot rail", cb: { x: 18, y: 30 }, ob: { x: 42, y: 46 }, target: { x: 30, y: 92 }, pocket: "SR", tip: { x: 0, y: .2 }, speed: 52 },
  { name: "Lag to the head rail", cb: { x: 25, y: 25 }, ob: null, target: { x: 25, y: 2.5 }, pocket: "FR", tip: { x: 0, y: .15 }, speed: 57 }
];
const SIM_BREAK0 = { cb: { x: 37, y: 22 }, ob: null, target: null, pocket: "SR", tip: { x: 0, y: -.1 }, speedPct: 90, hit: 0, tool: "cb" };
const SIM_KEYS = ["cb", "ob", "target", "pocket", "tip", "speedPct", "hit", "tool"];
function simPresetState(i) {
  const p = SIM_PRESETS[i];
  return { cb: { ...p.cb }, ob: p.ob ? { ...p.ob } : null, target: { ...p.target }, pocket: p.pocket, tip: { ...p.tip }, speedPct: p.speed, hit: null, tool: "cb", tz: "point", result: null, entry: null, outcome: null };
}
function simStart() { return S.simKind === "break" ? Object.assign({ result: null, entry: null, outcome: null, tz: "point" }, SIM_BREAK0) : simPresetState(S.simPreset || 0); }
const BRK_START = { tip: { x: 0, y: -.1 }, speedPct: 90, pocket: "SR", cb: { x: 37, y: 22 }, ob: null, target: null, result: null, entry: null, outcome: null, tool: "result", tz: "point", drill: BRK_DRILL, drillId: "" };
function setMode(m) {
  if (S.mode === m) return;
  const keep = {}; for (const k of MODE_KEYS) keep[k] = S[k];
  S.stash[S.mode] = JSON.parse(JSON.stringify(keep));
  if (S.mode === "sim") simStop();
  const next = S.stash[m] ? S.stash[m] : m === "break" ? BRK_START : m === "sim" ? simStart() : { tool: "result", drill: "", drillId: "", pocket: "FR", cb: { x: 20, y: 52 }, ob: { x: 40, y: 82 }, target: { x: 30, y: 70 }, result: null, entry: null, outcome: null };
  Object.assign(S, JSON.parse(JSON.stringify(next)));
  if (!S.tip) S.tip = { x: 0, y: 0 }; if (S.speedPct == null) S.speedPct = 40;
  S.vspin = vspinOf(S.tip); S.side = sideOf(S.tip); S.speed = speedOf(S.speedPct);
  if (m === "sim") { S.result = null; S.entry = null; S.outcome = null; S.tool = "cb"; }
  if (typeof S.hit !== "number") S.hit = m === "sim" && S.simKind === "shot" && S.ob && S.cb ? (ghostHit() || 0) : 0;
  if (m === "break") { S.ob = null; S.target = null; S.entry = null; S.drill = BRK_DRILL; S.drillId = ""; if (S.pocket !== "SL" && S.pocket !== "SR") S.pocket = "SL"; if (S.tool !== "cb") S.tool = "result"; }
  S.mode = m; S.rail = null; S.scratch = false; S.cbSec = null; S.ballsMade = null;
  saveWork();
}
let shots = ls.get(LS.shots, []);
if (!Array.isArray(shots)) shots = [];
let myDrills = ls.get(LS.drills, []);
if (!Array.isArray(myDrills)) myDrills = [];
/* Starter drills. Coordinates in inches: x from the left cushion, y from the head cushion. */
const DIAG = (t) => ({ x: Math.round(5000 * t) / 100, y: Math.round(10000 * t) / 100 });          // on the HL-FR diagonal
const GHOST_STR = { x: 36.99, y: 73.99 };                          // cue ball centre at contact for the OB at 3/4 diagonal
const STARTER = [
  { id: "s-stop", name: "Stop shot, straight in", desc: "Straight in to the foot-right corner. Stop the cue ball dead where it hits the object ball.",
    cb: DIAG(.5), ob: DIAG(.75), target: GHOST_STR, tz: "c3", pocket: "FR", vspin: "stun", side: "C", speed: 2 },
  { id: "s-stunrun", name: "Stun-follow 1 ft, straight in", desc: "Same straight shot. Hit a little above centre so the cue ball rolls on one foot past contact.",
    cb: DIAG(.5), ob: DIAG(.75), target: { x: 42.36, y: 84.72 }, tz: "c6", pocket: "FR", vspin: "stunrun", side: "C", speed: 2 },
  { id: "s-draw2", name: "Draw back 2 ft, straight in", desc: "Same straight shot. Draw the cue ball back two feet along the line.",
    cb: DIAG(.4), ob: DIAG(.75), target: { x: 26.26, y: 52.52 }, tz: "c6", pocket: "FR", vspin: "draw", side: "C", speed: 2 },
  { id: "s-tangent", name: "Stun along the tangent line", desc: "A 30° cut to the foot-right corner. Stun so the cue ball leaves on the tangent line and stops about 20 in from contact.",
    cb: { x: 40.3, y: 52 }, ob: { x: 40, y: 82 }, target: { x: 21.2, y: 89.2 }, tz: "c6", pocket: "FR", vspin: "stun", side: "C", speed: 2 },
  { id: "s-follow", name: "Follow to the foot rail", desc: "A gentle cut into the side pocket. Follow through to finish near the foot rail.",
    cb: { x: 18, y: 30 }, ob: { x: 42, y: 46 }, target: { x: 30, y: 92 }, tz: "dia", pocket: "SR", vspin: "follow", side: "C", speed: 3 },
  { id: "s-lag", name: "Lag to the head rail", desc: "Position only, no object ball. Shoot from the head string to the foot rail and back, finishing as close to the head rail as you can.",
    cb: { x: 25, y: 25 }, ob: null, target: { x: 25, y: 2.5 }, tz: "c6", pocket: "FR", vspin: "follow", side: "C", speed: 2 }
];
const allDrills = () => STARTER.concat(myDrills);
const findDrill = id => allDrills().find(d => d.id === id);

const store = {
  mode: "local", col: null,
  /* Local writes start from what is stored now, so a second open window of the app can't overwrite its shots. */
  fresh() { const v = ls.get(LS.shots, []); return Array.isArray(v) ? v : []; },
  saveLocal(next) {
    if (!ls.set(LS.shots, next)) { toast("Phone storage is full. Export your CSV, then delete old shots."); return false; }
    shots = next; return true;
  },
  async init() {
    const c = window.claude;
    if (!c || typeof c.use !== "function") return;
    try {
      const [db, user] = await Promise.all([c.use("db"), c.use("user")]);
      if (!db || !user) return;
      const id = await user.id();
      if (!id) return;
      this.col = db.collection("data/users/" + id + "/log/shots");
      this.dcol = db.collection("data/users/" + id + "/log/drills");
      this.dcol.onSnapshot(snap => { myDrills = snap.docs.map(d => Object.assign({}, d.data(), { id: d.id })).sort((a, b) => a.name < b.name ? -1 : 1); renderAll(); }, () => {});
      this.mode = "cloud";
      $("storeNote").textContent = "Syncing to your account";
      let first = true;
      const timer = setTimeout(() => { if (first) $("storeNote").textContent = "Still connecting…"; }, 10000);
      this.col.onSnapshot(snap => {
        clearTimeout(timer); first = false;
        shots = snap.docs.map(d => Object.assign({}, d.data(), { id: d.id })).sort((a, b) => a.ts < b.ts ? -1 : 1);
        $("storeNote").textContent = "Synced to your account";
        renderAll();
      }, err => {
        clearTimeout(timer);
        this.mode = "local"; this.col = null;
        shots = ls.get(LS.shots, []);
        $("storeNote").textContent = "Saved on this device";
        renderAll();
      });
    } catch (e) { /* stay local */ }
  },
  async add(shot) {
    if (this.mode === "cloud") {
      try { await this.col.doc(shot.id).set(clean(shot)); return true; }
      catch (e) { toast("Sync failed, kept on this device"); this.mode = "local"; }
    }
    return this.saveLocal(this.fresh().concat([shot]));
  },
  async addMany(list) {
    if (this.mode === "cloud") { for (const s of list) await this.add(s); return true; }
    return this.saveLocal(this.fresh().concat(list));
  },
  async remove(id) {
    if (this.mode === "cloud") { try { await this.col.doc(id).delete(); return true; } catch (e) { toast("Could not delete. Try again."); return false; } }
    return this.saveLocal(this.fresh().filter(s => s.id !== id));
  },
  async removeMany(ids) {
    if (this.mode === "cloud") { let ok = true; for (const id of ids) ok = (await this.remove(id)) && ok; return ok; }
    const drop = new Set(ids); return this.saveLocal(this.fresh().filter(s => !drop.has(s.id)));
  },
  /* Restore "Replace": on this device it's one write, so if it fails (storage full) the old records are still there. */
  async replaceAll(list) {
    if (this.mode === "cloud") return (await this.removeMany(shots.map(s => s.id))) && this.addMany(list);
    return this.saveLocal(list.slice());
  },
  dcol: null,
  async addDrill(d) {
    if (this.mode === "cloud" && this.dcol) { try { await this.dcol.doc(d.id).set(clean(d)); return; } catch (e) { toast("Sync failed, kept on this device"); } }
    myDrills.push(d); ls.set(LS.drills, myDrills);
  },
  async removeDrill(id) {
    if (this.mode === "cloud" && this.dcol) { try { await this.dcol.doc(id).delete(); return; } catch (e) { toast("Could not delete. Try again."); return; } }
    myDrills = myDrills.filter(d => d.id !== id); ls.set(LS.drills, myDrills);
  }
};
function saveWork() { ls.set(LS.work, S); }
function saveSettings() { ls.set(LS.settings, settings); }
