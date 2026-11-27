// Start-up: apply settings, draw, open the right tab, connect storage.
/* ---------- boot ---------- */
applyAppearance();
if (!pockets()[S.pocket]) S.pocket = "FR";
function placeColumns() {
  const a = document.querySelector(".colA"), b = document.querySelector(".colB");
  const top = [$("modeSeg"), document.querySelector(".drill"), $("drillInfo"), $("topRow"), $("playBar")];
  if (land) b.prepend(...top); else a.prepend(...top);
}
function applyOrientation() {
  land = !!(LAND_MQ && LAND_MQ.matches);
  document.body.classList.toggle("land", land);
  placeColumns(); buildTable(); updatePin(); if (view === "stats") renderStats();
}
land = !!(LAND_MQ && LAND_MQ.matches); document.body.classList.toggle("land", land); placeColumns();
if (LAND_MQ) { if (LAND_MQ.addEventListener) LAND_MQ.addEventListener("change", applyOrientation); else if (LAND_MQ.addListener) LAND_MQ.addListener(applyOrientation); }
buildTable();
const startView = (location.hash || "").slice(1);
setView(startView === "table" ? "settings" : ["stats", "shots", "settings"].includes(startView) ? startView : "log");
if (window.claude && typeof window.claude.use === "function") dlP = window.claude.use("downloads").catch(() => null);
store.init();
/* Another window of the app saved or deleted shots: pick up its changes. */
window.addEventListener("storage", e => {
  if (store.mode !== "local") return;
  if (e.key === LS.shots) { shots = store.fresh(); renderAll(); }
  if (e.key === LS.drills) { const d = ls.get(LS.drills, []); myDrills = Array.isArray(d) ? d : []; renderAll(); }
});
/* Ask Chrome to keep this app's data even when the phone is low on space. */
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) {}
