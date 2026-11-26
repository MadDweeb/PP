// Backup file: make, check (values are cleaned before use) and restore.
/* ---------- backup and restore ----------
   One JSON file with everything: shots and breaks, your drills, settings (table, colours, units, section order)
   and the physics tuning. CSV stays the format for spreadsheets; it can't be read back without losing detail. */
const BACKUP_KIND = "pool-shot-log-backup", BACKUP_VERSION = 1;
function makeBackup() {
  const set = Object.assign({}, settings); delete set.lastBackup;
  return { kind: BACKUP_KIND, version: BACKUP_VERSION, created: new Date().toISOString(),
    shots: shots.map(clean), drills: myDrills.map(clean), settings: clean(set), tune: clean(ls.get(TUNE_KEY, {})) };
}
function backupSummary(b) {
  const br = b.shots.filter(isBrk).length;
  return `${b.shots.length - br} shot${b.shots.length - br === 1 ? "" : "s"}, ${br} break${br === 1 ? "" : "s"}, ${b.drills.length} drill${b.drills.length === 1 ? "" : "s"}, settings and table tuning`;
}
async function exportBackup() {
  const b = makeBackup(), json = JSON.stringify(b);
  if (await saveFile(`pool-shot-log-backup-${dayStamp(new Date())}.json`, json, "application/json", "Backup")) {
    settings.lastBackup = b.created; saveSettings(); if (view === "settings") renderSettings();
  }
}
async function copyBackup() {
  const b = makeBackup(), json = JSON.stringify(b);
  try { await navigator.clipboard.writeText(json); settings.lastBackup = b.created; saveSettings(); toast("Backup copied. Paste it somewhere safe."); renderSettings(); }
  catch (e) { const ta = $("backupBox"); if (ta) { ta.hidden = false; ta.value = json; ta.select(); toast("Select all and copy"); } }
}
/* read and check a backup; returns it, or throws a message the person can act on */
function parseBackup(text) {
  let b; try { b = JSON.parse(text); } catch (e) { throw "That isn't a backup file (it isn't readable JSON)."; }
  if (!b || b.kind !== BACKUP_KIND) throw "That file isn't a Pool Shot Log backup.";
  if (b.version > BACKUP_VERSION) throw "That backup is from a newer version of the app. Update the app, then try again.";
  if (!Array.isArray(b.shots) || !Array.isArray(b.drills || [])) throw "That backup is damaged: the shot list is missing.";
  b.drills = b.drills || []; b.settings = b.settings && typeof b.settings === "object" ? b.settings : {}; b.tune = b.tune && typeof b.tune === "object" ? b.tune : {};
  b.shots = b.shots.filter(s => s && typeof s === "object" && s.id && s.ts).map(cleanRecord);
  b.drills = b.drills.filter(d => d && typeof d === "object" && d.id && d.name).map(cleanRecord);
  b.settings = cleanSettings(b.settings);
  const tn = {}; for (const [k, v] of Object.entries(b.tune)) if (Number.isFinite(+v) && v !== null && v !== "") tn[k] = +v; b.tune = tn;
  return b;
}
/* A backup can come from someone else (a pasted file), so its values are checked before they reach the page:
   text stays text only where the app escapes it or only looks it up; numbers and points are made numbers. */
const TEXT_KEYS = new Set(["id", "ts", "local", "drill", "drillId", "session", "notes", "kind", "vspin", "side", "pocket", "outcome", "tz", "rack", "cbSec", "name", "desc"]);
const numOrNull = v => v == null || v === "" ? null : Number.isFinite(+v) ? +v : null;
function cleanRecord(o) {
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    if (v == null || typeof v === "boolean") out[k] = v;
    else if (TEXT_KEYS.has(k)) out[k] = String(v);
    else if (typeof v === "object") { const q = {}; for (const [k2, v2] of Object.entries(v)) q[k2] = numOrNull(v2); out[k] = "x" in q && (q.x == null || q.y == null) ? null : q; }
    else out[k] = numOrNull(v);
  }
  return out;
}
function cleanSettings(set) {
  const out = {};
  for (const [k, v] of Object.entries(set)) {
    if (["cloth", "cushion", "rail"].includes(k)) { if (/^#[0-9a-f]{6}$/i.test(v)) out[k] = String(v).toLowerCase(); }
    else if (["W", "L", "wc", "ws"].includes(k)) { if (Number.isFinite(+v) && +v > 0) out[k] = +v; }
    else if (["theme", "units", "grid"].includes(k)) { if (typeof v === "string") out[k] = v; }
    else if (["labels", "pinTable", "wakeLock", "haptics"].includes(k)) out[k] = !!v;
    else if (k === "cardOrder" || k === "speedSide") { if (v && typeof v === "object") out[k] = JSON.parse(JSON.stringify(v)); }
  }
  return out;
}
let pendingRestore = null;
async function readBackupFile(file) {
  try { pendingRestore = parseBackup(await file.text()); }
  catch (e) { pendingRestore = null; toast(typeof e === "string" ? e : "Could not read that file"); }
  renderSettings();
}
async function applyRestore(mode) {
  const b = pendingRestore; if (!b) return;
  pendingRestore = null;
  let added = 0;
  if (mode === "replace") {
    if (!(await store.replaceAll(b.shots))) { renderAll(); return; }
    for (const d of myDrills.slice()) await store.removeDrill(d.id);
    added = b.shots.length;
    for (const d of b.drills) await store.addDrill(d);
  } else {
    const have = new Set(shots.map(s => s.id)), add = b.shots.filter(s => !have.has(s.id));
    if (add.length && !(await store.addMany(add))) { renderAll(); return; }
    added = add.length;
    const haveD = new Set(myDrills.map(d => d.id));
    for (const d of b.drills) if (!haveD.has(d.id)) await store.addDrill(d);
  }
  const keepLast = settings.lastBackup;
  for (const k of Object.keys(settings)) delete settings[k];
  Object.assign(settings, { W: 50, L: 100, wc: 4.25, ws: 4.75, grid: "8x4", labels: false, theme: "system", units: "imperial" }, COLOR_DEFAULTS, b.settings, { lastBackup: keepLast });
  saveSettings();
  ls.set(TUNE_KEY, Object.assign({}, ls.get(TUNE_KEY, {}), b.tune)); loadTune(); renderKnobs();
  applyAppearance(); buildTable(); renderAll();
  toast(mode === "replace" ? `Restored ${added} records from the backup` : added ? `Added ${added} records you didn't have` : "Nothing new to add: you already had every record");
}
