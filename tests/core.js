// Loads the app's side-effect-free source files (CORE in tools/build.py) without a page, for the tests.
// They run together inside one function, as in the built app, with a test `settings` object and
// test `shots` list standing in for the app state.
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");
const CORE = ["constants.js", "util.js", "geometry.js", "rules.js", "csv.js", "backup.js", "stats.js", "stats-breaks.js"];
const EXPORTS = [
  "R_BALL", "vspinOf", "sideOf", "speedOf", "tipFromLabels", "isBrk", "sectionOf", "secOf",
  "clean", "r2", "fmt", "esc", "len", "sub", "unit", "clampBall", "toU", "fromU", "fls",
  "pockets", "zoneShape", "inZone", "zone", "sessionOf", "aimDir", "pocketOffset", "aimErrorDeg", "cutAngle",
  "rackLayout", "spotBall", "newRack", "lowestBall", "legalFirst", "callable", "needsCall", "shotFacts", "ref", "choose", "canSee", "pushAvailable", "groupOf",
  "CSV_COLS", "toCsv",
  "BACKUP_KIND", "BACKUP_VERSION", "parseBackup", "cleanRecord", "cleanSettings",
  "mean", "sd", "summarize", "missLR", "cutBand", "brkSummary", "spotBand",
];

function loadCore(over = {}) {
  const settings = Object.assign({ W: 50, L: 100, wc: 4.25, ws: 4.75, grid: "8x4", labels: false, theme: "system", units: "imperial" }, over);
  const code = CORE.map(f => fs.readFileSync(path.join(SRC, "js", f), "utf8")).join("\n");
  const make = new Function("settings", "shots", `"use strict";\n${code}\nreturn { ${EXPORTS.join(", ")} };`);
  const app = make(settings, []);
  app.settings = settings;
  return app;
}

module.exports = { loadCore };
