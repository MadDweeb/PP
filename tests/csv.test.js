// CSV export: columns, units and quoting.
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadCore } = require("./core");

const shot = {
  id: "s1", ts: "2026-11-26T10:00:00.000Z", local: "2026-11-26 18:00", session: "ses-1", drill: "Stop shot", drillId: "s-stop", shotNo: 3,
  vspin: "stun", side: "C", speed: 2, speedPct: 40, tip: { x: 0, y: -0.1 }, pocket: "FR",
  cb: { x: 25, y: 50 }, ob: { x: 37.5, y: 75 }, target: { x: 37, y: 74 }, result: { x: 38, y: 74.5 },
  entry: { x: 48.4, y: 98.6 }, outcome: "made", cut: 0, obDist: 32.5, cbErr: 1.12, cbDx: 1, cbDy: 0.5, tz: "c3", inZone: 1,
  pocketOff: 0.12, aimErr: 0.21, notes: 'tight, "nice"', example: false, table: { W: 50, L: 100, wc: 4.25, ws: 4.75 }
};
const brk = {
  id: "b1", kind: "break", ts: "2026-11-26T10:05:00.000Z", local: "2026-11-26 18:05", session: "ses-1", drill: "Cut break", shotNo: 1, rack: "9",
  vspin: "stun", side: "C", speed: 4, speedPct: 90, tip: { x: 0, y: -0.1 }, cb: { x: 37, y: 22 }, result: null, scratch: 1, cbSec: "scratch",
  pocket: "SL", outcome: "missed", rail: -2.5, ballsMade: 0, hit: 0.25, predRail: 1.5, notes: "", table: { W: 50, L: 100, wc: 4.25, ws: 4.75 }
};
const parse = csv => csv.trimEnd().split("\r\n").map(l => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).slice(0, -1).map(c => c.replace(/,$/, "")));

test("one header row, one row per record, CRLF line ends", () => {
  const app = loadCore(); const csv = app.toCsv([shot, brk]);
  assert.ok(csv.endsWith("\r\n"));
  const rows = parse(csv);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].length, app.CSV_COLS.length);
  for (const r of rows) assert.equal(r.length, rows[0].length);
});

test("imperial columns end in _in and hold inches", () => {
  const app = loadCore(); const [h, r] = parse(app.toCsv([shot]));
  const col = n => r[h.indexOf(n)];
  assert.ok(h.includes("cb_start_x_in") && !h.some(n => n.endsWith("_cm")));
  assert.equal(col("cb_start_x_in"), "25");
  assert.equal(col("record_type"), "shot");
  assert.equal(col("cb_end_zone_8x4"), "D6");
  assert.equal(col("notes"), '"tight, ""nice"""');                    // commas and quotes are quoted
});

test("metric renames every _in column to _cm and converts it; tip stays in ball radii", () => {
  const app = loadCore({ units: "metric" }); const [h, r] = parse(app.toCsv([shot]));
  const col = n => r[h.indexOf(n)];
  assert.ok(!h.some(n => n.endsWith("_in")));
  assert.equal(col("cb_start_x_cm"), "63.5");
  assert.equal(col("table_w_cm"), "127");
  assert.equal(col("tip_y_radii"), "-0.1");
  // the offset is rounded to 0.01 in first, then converted (0.11 in -> 0.28 cm)
  assert.equal(col("tip_offset_cm"), "0.28");
});

test("break rows fill the break columns", () => {
  const app = loadCore(); const [h, , r] = parse(app.toCsv([shot, brk]));
  const col = n => r[h.indexOf(n)];
  assert.equal(col("record_type"), "break");
  assert.equal(col("cb_section"), "scratch");
  assert.equal(col("cb_scratch"), "1");
  assert.equal(col("ob1_rail_offset_in"), "-2.5");
  assert.equal(col("break_rack"), "9");
  assert.equal(col("cb_end_x_in"), "");
});
