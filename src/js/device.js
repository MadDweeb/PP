// Phone features for use at the table: keep the screen on while logging, and a short vibration when a shot saves.
/* ---------- at the table ---------- */
let wakeLock = null, wakeBusy = false;
const wakeSupported = () => !!(navigator.wakeLock && navigator.wakeLock.request);
/* The phone drops the lock whenever the app is hidden, so it is asked for again each time the Log tab is back in view. */
async function updateWakeLock() {
  if (wakeBusy || !wakeSupported()) return;
  const want = settings.wakeLock !== false && view === "log" && document.visibilityState === "visible";
  wakeBusy = true;
  try {
    if (want && !wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    } else if (!want && wakeLock) { const l = wakeLock; wakeLock = null; await l.release(); }
  } catch (e) { wakeLock = null; }       // refused (battery saver, no permission): the app works as before
  finally { wakeBusy = false; }
}
document.addEventListener("visibilitychange", updateWakeLock);
/* iPhone and iPad (iPadOS reports itself as a Mac, but with a touch screen) */
function isIOS() { return /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); }
/* opened from the Home Screen icon rather than a browser tab */
function isInstalled() { return navigator.standalone === true || !!(window.matchMedia && matchMedia("(display-mode: standalone)").matches); }
const vibrateSupported = () => typeof navigator.vibrate === "function";
/* iPhone in Safari: a one-time note on how to add the app to the Home Screen, where it runs full screen and Safari keeps its data */
function renderIosHint() {
  const el = $("iosHint"); if (!el) return;
  el.hidden = !(isIOS() && !isInstalled() && !settings.iosHintSeen && view === "log");
}
document.addEventListener("click", e => {
  if (e.target.closest("#iosHintOk")) { settings.iosHintSeen = true; saveSettings(); renderIosHint(); }
});
function buzz() { if (settings.haptics === false || !navigator.vibrate) return; try { navigator.vibrate(15); } catch (e) {} }
