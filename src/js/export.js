// Saving files (CSV) and copying CSV.
let dlP = null;
const dayStamp = d => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
/* save a text file: the host's save dialog when there is one, else a normal download. Returns true when saved. */
async function saveFile(name, data, mime, what) {
  const dl = dlP ? await dlP : null;
  if (dl) {
    try { await dl.save({ filename: name, data }); toast(what + " saved"); return true; }
    catch (e) { if (e && e.code === "declined") return false; if (e && e.code === "host_unavailable") { toast(`This app can't save files. Use Copy ${what} instead.`); return false; } }
  }
  try {
    const url = URL.createObjectURL(new Blob([data], { type: mime }));
    const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch (e) { toast(`Download blocked. Use Copy ${what} instead.`); return false; }
}
async function exportCsv() {
  if (!shots.length) { toast("No shots to export yet"); return; }
  await saveFile(`pool-shots-${dayStamp(new Date())}.csv`, toCsv(shots), "text/csv", "CSV");
}

async function copyCsv() {
  const csv = toCsv(shots);
  try { await navigator.clipboard.writeText(csv); toast(`Copied ${shots.length} shots as CSV`); }
  catch (e) { const ta = $("csvBox"); if (ta) { ta.hidden = false; ta.value = csv; ta.select(); toast("Select all and copy"); } }
}
