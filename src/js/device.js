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
function buzz() { if (settings.haptics === false || !navigator.vibrate) return; try { navigator.vibrate(15); } catch (e) {} }
