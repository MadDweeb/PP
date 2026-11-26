// The Shots tab list.
/* ---------- shots list ---------- */
let pendingDel = null, pendingT;
function renderShots() {
  const v = $("view-shots");
  const hasEx = shots.some(s => s.example);
  const head = `<div class="row"><button class="btn primary" id="exportCsv">Export CSV</button><button class="btn" id="copyCsv">Copy CSV</button>${hasEx ? `<button class="btn" id="clearEx">Remove examples</button>` : ""}</div><textarea id="csvBox" rows="6" hidden aria-label="CSV text"></textarea>`;
  if (!shots.length) { v.innerHTML = head + emptyState("No shots logged", "Every shot you save appears here, newest first. Export them as CSV for your own analysis."); return; }
  const list = shots.slice().reverse();
  const nb = shots.filter(isBrk).length, ns = shots.length - nb;
  v.innerHTML = head + `<p class="note">${ns} shot${ns === 1 ? "" : "s"}${nb ? ` and ${nb} break${nb === 1 ? "" : "s"}` : ""}. Tap Delete twice to remove one.</p><div class="shotlist">` + list.map(s => {
    const oc = OUTCOME.find(o => o[0] === s.outcome);
    if (isBrk(s)) return `<div class="shot"><span class="n">${s.shotNo}</span>
      <span class="l1">Cut break · ${label(RACKS, s.rack || "9")}${s.example ? ' <span class="pill">example</span>' : ""}</span>
      <button class="btn danger del" data-del="${esc(s.id)}">${pendingDel === s.id ? "Confirm" : "Delete"}</button>
      <span class="l2">${esc(s.local || "")} · ${POCKET_NAMES[s.pocket] || ""} ${oc ? `<span class="pill ${oc[2]}">1-ball ${oc[1].toLowerCase()}</span>` : ""}${s.rail != null ? ` · <span class="num">${railTxt(s.rail)}</span>` : ""}${s.scratch ? ' · <span class="pill bad">scratch</span>' : secOf(s) ? ` · cue ball ${label(CB_SECS, secOf(s)).toLowerCase()}` : ""}${s.ballsMade != null ? ` · ${s.ballsMade} made` : ""} · ${speedText(s)}</span></div>`;
    return `<div class="shot"><span class="n">${s.shotNo}</span>
      <span class="l1">${esc(s.drill || "Unnamed drill")}${s.example ? ' <span class="pill">example</span>' : ""}</span>
      <button class="btn danger del" data-del="${esc(s.id)}">${pendingDel === s.id ? "Confirm" : "Delete"}</button>
      <span class="l2">${esc(s.local || "")} · ${label(VLAB, s.vspin)}, ${label(SIDE, s.side).toLowerCase()}, ${speedText(s)} · ${POCKET_NAMES[s.pocket] || ""} ${oc ? `<span class="pill ${oc[2]}">${oc[1]}</span>` : ""}${s.cbErr != null ? ` · <span class="num">${fls(s.cbErr, 1)}</span>` : ""}</span></div>`;
  }).join("") + `</div>`;
}
