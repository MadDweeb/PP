// Backup files: reading, rejecting bad files, and cleaning values from files that came from someone else.
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadCore } = require("./core");

const good = app => ({
  kind: app.BACKUP_KIND, version: app.BACKUP_VERSION, created: "2026-11-26T10:00:00.000Z",
  shots: [{ id: "s1", ts: "2026-11-26T10:00:00.000Z", shotNo: 1, notes: "fine", result: { x: 10, y: 20 }, tip: { x: 0, y: 0.1 }, outcome: "made" }],
  drills: [{ id: "u-1", name: "My drill", cb: { x: 1, y: 2 }, ob: null }],
  settings: { W: 50, L: 100, cloth: "#2E7D4F", units: "metric", cardOrder: { shot: ["tip", "marks"] } },
  tune: { mu_r: 0.012 }
});

test("a good backup reads back the same", () => {
  const app = loadCore(); const b = app.parseBackup(JSON.stringify(good(app)));
  assert.equal(b.shots.length, 1);
  assert.deepEqual(b.shots[0].result, { x: 10, y: 20 });
  assert.equal(b.shots[0].notes, "fine");
  assert.equal(b.drills[0].ob, null);
  assert.equal(b.settings.cloth, "#2e7d4f");
  assert.deepEqual(b.settings.cardOrder, { shot: ["tip", "marks"] });
  assert.equal(b.tune.mu_r, 0.012);
});

test("files that aren't backups are refused with a message", () => {
  const app = loadCore();
  assert.throws(() => app.parseBackup("not json"), /isn't a backup file/);
  assert.throws(() => app.parseBackup(JSON.stringify({ kind: "other" })), /isn't a Pool Shot Log backup/);
  assert.throws(() => app.parseBackup(JSON.stringify(Object.assign(good(app), { version: 99 }))), /newer version/);
  assert.throws(() => app.parseBackup(JSON.stringify(Object.assign(good(app), { shots: null }))), /damaged/);
});

test("records without an id or time are dropped", () => {
  const app = loadCore(); const g = good(app);
  g.shots.push({ ts: "x" }, null, "junk");
  assert.equal(app.parseBackup(JSON.stringify(g)).shots.length, 1);
});

test("markup in numbers, points, colours or sizes never gets through", () => {
  const app = loadCore(); const g = good(app);
  Object.assign(g.shots[0], { shotNo: "<img src=x onerror=alert(1)>", speedPct: "40", result: { x: '1" onmouseover="x', y: 5 } });
  Object.assign(g.settings, { cloth: '#fff" onfocus="x', L: '100"><script>', rail: "red" });
  g.tune.mu_s = "<b>";
  const b = app.parseBackup(JSON.stringify(g));
  assert.equal(b.shots[0].shotNo, null);
  assert.equal(b.shots[0].speedPct, 40);
  assert.equal(b.shots[0].result, null);
  assert.equal("cloth" in b.settings, false);
  assert.equal("L" in b.settings, false);
  assert.equal("rail" in b.settings, false);
  assert.equal("mu_s" in b.tune, false);
  assert.equal(b.shots[0].notes, "fine");          // text the app escapes stays text
});

test("the at-the-table switches come back from a backup as true or false", () => {
  const app = loadCore(), g = good(app);
  g.settings.wakeLock = 0; g.settings.haptics = "yes"; g.settings.junk = "<b>";
  const b = app.parseBackup(JSON.stringify(g));
  assert.equal(b.settings.wakeLock, false);
  assert.equal(b.settings.haptics, true);
  assert.equal("junk" in b.settings, false);
});

test("a backup keeps the Play settings and each player's cue, and drops anything else in them", () => {
  const { cleanSettings } = require("./core.js").loadCore();
  const out = cleanSettings({ playPaths: "cue", playBreak: "kitchen", cues: [{ shaft: "carbon", butt: "ebony", inlay: "rings", wrap: "linen", tip: "phenolic", chalk: "red", junk: 1 }, { shaft: 5 }, { butt: "x" }] });
  assert.equal(out.playPaths, "cue"); assert.equal(out.playBreak, "kitchen");
  assert.deepEqual(out.cues, [{ shaft: "carbon", butt: "ebony", inlay: "rings", wrap: "linen", tip: "phenolic", chalk: "red" }, {}]);
});

test("Play settings from a backup: solo is true or false, names are short text", () => {
  const app = loadCore(), g = good(app);
  g.settings.playSolo = "yes"; g.settings.playPulse = 0; g.settings.playNames = ["Wong", "x".repeat(40), "extra"]; g.settings.playShots = "3";
  const b = app.parseBackup(JSON.stringify(g));
  assert.equal(b.settings.playSolo, true);
  assert.equal(b.settings.playPulse, false);
  assert.deepEqual(b.settings.playNames, ["Wong", "x".repeat(16)]);
  assert.equal(b.settings.playShots, 3);
});
