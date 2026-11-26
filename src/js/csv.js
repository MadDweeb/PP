// CSV export columns and formatting.
/* ---------- CSV ---------- */
const CSV_COLS = [
  ["shot_id", s => s.id], ["record_type", s => isBrk(s) ? "break" : "shot"], ["timestamp_utc", s => s.ts], ["local_time", s => s.local], ["session_id", s => sessionOf(s)], ["drill", s => s.drill], ["drill_id", s => s.drillId || ""], ["shot_no", s => s.shotNo],
  ["vertical_spin", s => s.vspin], ["side_spin", s => s.side], ["tip_x_radii", s => s.tip && s.tip.x], ["tip_y_radii", s => s.tip && s.tip.y],
  ["tip_offset_in", s => s.tip ? r2(Math.hypot(s.tip.x, s.tip.y) * R_BALL) : null], ["speed_pct", s => s.speedPct], ["speed_1to4", s => s.speed], ["target_pocket", s => s.pocket],
  ["cb_start_x_in", s => s.cb && s.cb.x], ["cb_start_y_in", s => s.cb && s.cb.y],
  ["ob_start_x_in", s => s.ob && s.ob.x], ["ob_start_y_in", s => s.ob && s.ob.y],
  ["cut_angle_deg", s => s.cut], ["ob_to_pocket_in", s => s.obDist],
  ["cb_target_x_in", s => s.target && s.target.x], ["cb_target_y_in", s => s.target && s.target.y],
  ["cb_end_x_in", s => s.result && s.result.x], ["cb_end_y_in", s => s.result && s.result.y],
  ["cb_end_zone_8x4", s => zone(s.result, 4, 8)], ["cb_end_zone_16x8", s => zone(s.result, 8, 16)], ["cb_target_zone_8x4", s => zone(s.target, 4, 8)],
  ["target_zone", s => s.target ? (s.tz || "point") : ""], ["cb_in_zone", s => s.inZone],
  ["cb_error_in", s => s.cbErr], ["cb_error_dx_in", s => s.cbDx], ["cb_error_dy_in", s => s.cbDy],
  ["pocket_result", s => s.outcome], ["pocket_entry_x_in", s => s.entry && s.entry.x], ["pocket_entry_y_in", s => s.entry && s.entry.y],
  ["pocket_offset_in", s => s.pocketOff], ["aim_error_deg", s => s.aimErr],
  ["break_rack", s => isBrk(s) ? s.rack || "" : ""], ["ob1_rail_offset_in", s => isBrk(s) ? s.rail : null], ["cb_scratch", s => isBrk(s) ? (s.scratch ? 1 : 0) : null], ["cb_section", s => isBrk(s) ? secOf(s) || "" : ""], ["ob1_hit_offset_balls", s => isBrk(s) ? (s.hit || 0) : null], ["ob1_pred_rail_offset_in", s => isBrk(s) ? s.predRail : null], ["balls_made", s => isBrk(s) ? s.ballsMade : null],
  ["table_w_in", s => s.table && s.table.W], ["table_l_in", s => s.table && s.table.L], ["notes", s => s.notes], ["is_example", s => s.example ? 1 : 0]
];
function toCsv(list) {
  // In metric, every *_in column becomes *_cm with its values converted. Tip x/y stay in ball radii.
  const m = isMetric(), cols = CSV_COLS.map(([n, f]) => m && /_in$/.test(n) ? [n.replace(/_in$/, "_cm"), s => { const v = f(s); return v == null || v === "" ? v : r2(v * 2.54); }] : [n, f]);
  const q = v => { if (v == null) return ""; const s = String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return [cols.map(c => c[0]).join(",")].concat(list.map(s => cols.map(c => q(c[1](s))).join(","))).join("\r\n") + "\r\n";
}
