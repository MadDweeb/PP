// Theme and table colours.
/* ---------- appearance ---------- */
const INITIAL_THEME = document.documentElement.getAttribute("data-theme");
function applyAppearance() {
  const r = document.documentElement;
  if (settings.theme === "light" || settings.theme === "dark") r.setAttribute("data-theme", settings.theme);
  else if (INITIAL_THEME) r.setAttribute("data-theme", INITIAL_THEME); else r.removeAttribute("data-theme");
  for (const k of ["cloth", "cushion", "rail"]) r.style.setProperty("--" + k, settings[k] || COLOR_DEFAULTS[k]);
}
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * f))));
  return "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
}
