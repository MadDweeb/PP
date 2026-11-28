// Constants: spin, speed, outcomes, pockets, tools, storage keys and helpers, cut break helpers. No side effects.
/* ---------- constants ---------- */
const R_BALL = 1.125;          // 2 1/4 in ball
const RAIL = 4.5;              // drawn rail width, inches
/* Vertical spin comes from where the tip hit the cue ball (tip.y, in ball radii, + is above centre). */
const VSPIN = [["draw","Draw"],["stundraw","Stun-draw"],["stun","Centre"],["stunrun","Stun-follow"],["follow","Follow"]];
/* "stun" is the key for a hit within the band through the middle of the ball (|up/down| < TIP_STUN); it is shown as Centre,
   because a centre-ball hit is not a stun in itself. The key stays "stun" so saved shots, drills and CSVs keep working. */
const VLAB = VSPIN.concat([["centre","Centre ball"]]);   // "Centre ball" only on shots logged before the cue ball picker
const SIDE = [["L","Left"],["C","No side"],["R","Right"]];
const SPEED = [[1,"Soft"],[2,"Medium"],[3,"Firm"],[4,"Power"]];
const TIP_STUN = .12, TIP_FULL = .4, TIP_SIDE = .12, TIP_MISCUE = .5, TIP_MAX = .7;
function vspinOf(t) { const y = t.y; return y >= TIP_FULL ? "follow" : y >= TIP_STUN ? "stunrun" : y > -TIP_STUN ? "stun" : y > -TIP_FULL ? "stundraw" : "draw"; }
function sideOf(t) { return t.x >= TIP_SIDE ? "R" : t.x <= -TIP_SIDE ? "L" : "C"; }
function speedOf(p) { return p < 25 ? 1 : p < 50 ? 2 : p < 75 ? 3 : 4; }
/* For shots and drills saved before the picker: a typical tip point and speed for each old label */
function tipFromLabels(v, sd) { return { x: sd === "L" ? -.3 : sd === "R" ? .3 : 0, y: ({ draw: -.55, stundraw: -.25, stun: 0, centre: 0, stunrun: .25, follow: .55 })[v] || 0 }; }
function pctFromSpeed(n) { return ({ 1: 15, 2: 40, 3: 63, 4: 88 })[n] || 40; }
const OUTCOME = [["made","Made","good"],["rattled","Rattled out","warn"],["missed","Missed","bad"]];
const POCKET_NAMES = { HL:"Head left", HR:"Head right", SL:"Side left", SR:"Side right", FL:"Foot left", FR:"Foot right" };
const TOOLS = [
  ["cb","Cue ball"],["ob","Object ball"],["target","CB target"],["result","CB result"]
];
const HINTS = {
  cb: "Tap or drag to set where the cue ball starts.",
  ob: "Tap or drag to set the object ball. Tap a pocket to aim at it.",
  target: "Tap where you want the cue ball to finish.",
  result: "Tap where the cue ball actually stopped. Drag to fine-tune."
};
const TOOLS_BRK = [["cb", "Break spot"], ["result", "CB finish"]];
const HINTS_BRK = {
  cb: "Tap or drag behind the head string to set where you broke from. The white box is the break box.",
  result: "Tap where the cue ball stopped. Tap a side pocket to change the target."
};
const ZONES = [["point", "Point"], ["c3", "3 in circle"], ["c6", "6 in circle"], ["half", "Half-diamond box"], ["dia", "Diamond box"]];
const SESSION_GAP_MS = 2 * 3600e3;
const LS = { shots: "psl.shots.v1", work: "psl.work.v1", settings: "psl.settings.v1", drills: "psl.drills.v1" };

/* ---------- storage helpers ---------- */
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};
const COLOR_DEFAULTS = { cloth: "#8a9399", cushion: "#737c82", rail: "#2b2723" };
/* ---------- cut break mode ----------
   Breaks are saved in the same list as shots, marked kind: "break", so storage, sessions and CSV
   export stay in one place. The shot stats leave them out; they get their own stats. */
const BRK_DRILL = "Cut break";
const RACKS = [["8", "8-ball"], ["9", "9-ball"], ["10", "10-ball"]];
const RAIL_LIM = 12;                        // the rail strip shows 12 in either side of the side pocket centre
const isBrk = s => !!s && s.kind === "break";
/* Cue ball finish sections, split at the 3rd and 5th diamonds: lower (head end), centre (around the side pockets), upper (foot end) */
const CB_SECS = [["upper", "Upper"], ["centre", "Centre"], ["lower", "Lower"], ["scratch", "Scratch"]];
const sectionOf = (p, Lt) => { if (!p) return null; const L = Lt || settings.L; return p.y < L * 3 / 8 ? "lower" : p.y > L * 5 / 8 ? "upper" : "centre"; };
const secOf = s => s.cbSec || (s.scratch ? "scratch" : s.result ? sectionOf(s.result, s.table && s.table.L) : null);
const brkMode = () => S.mode === "break";
const simMode = () => S.mode === "sim";
const playMode = () => S.mode === "sim" && S.simKind === "play";
const simBrk = () => S.mode === "sim" && S.simKind === "break";
const brkShape = () => brkMode() || simBrk();      // break-shaped table: rack, break box, kitchen
const MODE_KEYS = ["tip", "vspin", "side", "speed", "speedPct", "pocket", "cb", "ob", "target", "result", "entry", "outcome", "tool", "tz", "drill", "drillId", "hit"];
