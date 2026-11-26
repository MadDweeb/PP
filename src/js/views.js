// Switching tabs and re-rendering.
/* ---------- views ---------- */
function emptyState(h, p) { return `<div class="empty"><strong>${h}</strong><p>${p}</p><button class="btn" data-action="examples">Try it with 20 example shots</button></div>`; }
let view = "log";
function setView(v) {
  view = v;
  for (const b of document.querySelectorAll(".tabs button")) b.setAttribute("aria-selected", b.dataset.view === v);
  for (const k of ["log", "stats", "shots", "settings"]) $("view-" + k).hidden = k !== v;
  try { history.replaceState(null, "", v === "log" ? location.pathname + location.search : "#" + v); } catch (e) {}
  renderAll();
  window.scrollTo(0, 0);
  updateWakeLock();
}
function renderAll() {
  if (view === "log") renderLog();
  if (view === "stats") renderStats();
  if (view === "shots") renderShots();
  if (view === "settings") renderSettings();
}
async function addExamples() {
  const ex = exampleShots();
  if (!(await store.addMany(ex))) return;
  renderAll(); toast("Added 20 example shots. Remove them from the Shots tab.");
}
