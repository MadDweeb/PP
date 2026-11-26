// Small helpers: DOM lookup, escaping, rounding, 2D vectors, toast, and units (stored in inches, shown in in or cm).
function clean(o) { return JSON.parse(JSON.stringify(o, (k, v) => v === undefined ? null : v)); }
/* ---------- utils ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const r2 = v => Math.round(v * 100) / 100;
const fmt = (v, d = 1) => v == null || isNaN(v) ? "–" : (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a, k) => ({ x: a.x * k, y: a.y * k });
const dot = (a, b) => a.x * b.x + a.y * b.y;
const len = a => Math.hypot(a.x, a.y);
const unit = a => { const l = len(a) || 1; return { x: a.x / l, y: a.y / l }; };
const clampBall = p => ({ x: Math.min(settings.W - R_BALL, Math.max(R_BALL, p.x)), y: Math.min(settings.L - R_BALL, Math.max(R_BALL, p.y)) });
const toSvg = p => ({ x: p.x, y: settings.L - p.y });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
let toastT;
function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2200); }

/* ---------- units: everything is stored in inches; metric only changes what is shown ---------- */
const isMetric = () => settings.units === "metric";
const uName = () => isMetric() ? "cm" : "in";
const toU = v => v == null ? null : isMetric() ? v * 2.54 : v;
const fromU = v => isMetric() ? v / 2.54 : v;
const ud = d => isMetric() && d >= 2 ? 1 : d;
const fl = (v, d = 1) => fmt(toU(v), ud(d));                       // number in the display unit
const fls = (v, d = 1) => v == null || isNaN(v) ? "–" : fl(v, d) + " " + uName();
const sgn = (v, d = 2) => v == null ? "–" : (v >= 0 ? "+" : "") + fls(v, d);
const zoneName = k => k === "c3" ? (isMetric() ? "7.6 cm circle" : "3 in circle") : k === "c6" ? (isMetric() ? "15 cm circle" : "6 in circle") : label(ZONES, k);
/* tip offset on the ball: mm in metric, inches in imperial */
const tipLen = r => isMetric() ? Math.round(r * R_BALL * 25.4) + " mm" : fmt(r * R_BALL, 2) + " in";
const speedText = s => (s.speedPct != null ? s.speedPct + "% " : "") + label(SPEED, s.speed).toLowerCase();
