// Send feedback: the club Google Form link with tab, version and device filled in.
/* ---------- feedback: the club Google Form, with the tab, app version and phone filled in ---------- */
const APP_VERSION = "2026.11.28-play-fullscreen";
const FEEDBACK_FORM = "https://docs.google.com/forms/d/e/1FAIpQLSc2I7ezYHUnVFqxsS-ih7k8uljZ2TruEJ4os5WCLlriBqMbyg/viewform";
const FB_ENTRY = { tab: "entry.823033499", version: "entry.1110955210", device: "entry.995188720" };
function feedbackTab() {
  if (view === "log") return S.mode === "break" ? "Cut break" : S.mode === "sim" ? "Simulator" : "Logging shots";
  return { stats: "Stats", shots: "Shots list", settings: "Settings or backup" }[view] || "Something else";
}
function deviceText() {
  const ua = navigator.userAgent || "", os = /Android [\d.]+/.exec(ua) || /iPhone OS [\d_]+/.exec(ua) || /iPad|Windows NT [\d.]+|Mac OS X [\d_]+|Linux/.exec(ua);
  const br = /SamsungBrowser\/[\d.]+|Edg\/[\d.]+|CriOS\/[\d.]+|Chrome\/[\d.]+|FxiOS\/[\d.]+|Firefox\/[\d.]+|Version\/[\d.]+ .*Safari/.exec(ua);
  const app = matchMedia("(display-mode: standalone)").matches ? "installed app" : "browser";
  return [os && os[0].replace(/_/g, "."), br && br[0].replace(/ .*Safari/, " Safari"), app, `${screen.width}×${screen.height}`].filter(Boolean).join(", ");
}
function feedbackUrl() {
  const q = new URLSearchParams({ usp: "pp_url" });
  q.set(FB_ENTRY.tab, feedbackTab()); q.set(FB_ENTRY.version, APP_VERSION); q.set(FB_ENTRY.device, deviceText());
  return FEEDBACK_FORM + "?" + q.toString();
}
/* the link gets its address at the moment it is tapped, so it always names the tab you were on */
document.addEventListener("click", e => { const a = e.target.closest("#fbLog, #fbSettings"); if (a) a.href = feedbackUrl(); }, true);
