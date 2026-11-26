// The Shots tab list: grouped by session, newest first. A tap on a row opens its actions.
/* ---------- shots list ---------- */
let pendingDel = null, pendingT, openShot = null;
function shotLine(s) {
  const oc = OUTCOME.find(o => o[0] === s.outcome);
  if (isBrk(s)) return {
    l1: `Cut break · ${label(RACKS, s.rack || "9")}`,
    l2: `${esc((s.local || "").slice(11))} · ${POCKET_NAMES[s.pocket] || ""} ${oc ? `<span class="pill ${oc[2]}">1-ball ${oc[1].toLowerCase()}</span>` : ""}${s.rail != null ? ` · <span class="num">${railTxt(s.rail)}</span>` : ""}${s.scratch ? ' · <span class="pill bad">scratch</span>' : secOf(s) ? ` · cue ball ${label(CB_SECS, secOf(s)).toLowerCase()}` : ""}${s.ballsMade != null ? ` · ${s.ballsMade} made` : ""} · ${speedText(s)}`
  };
  return {
    l1: esc(s.drill || "Unnamed drill"),
    l2: `${esc((s.local || "").slice(11))} · ${label(VLAB, s.vspin)}, ${label(SIDE, s.side).toLowerCase()}, ${speedText(s)}${s.pocket ? " · " + (POCKET_NAMES[s.pocket] || "") : ""} ${oc ? `<span class="pill ${oc[2]}">${oc[1]}</span>` : ""}${s.cbErr != null ? ` · <span class="num">${fls(s.cbErr, 1)}</span> from target` : ""}`
  };
}
function shotRow(s) {
  const { l1, l2 } = shotLine(s), open = openShot === s.id, id = esc(s.id);
  return `<div class="shotrow"${open ? " data-open" : ""}><button class="shot" data-row="${id}" aria-expanded="${open}"><span class="n">${s.shotNo}</span>
    <span class="l1">${l1}${s.example ? ' <span class="pill">example</span>' : ""}</span><span class="l2">${l2}</span></button>
    ${open ? `<div class="shotacts">${s.notes ? `<p class="note">${esc(s.notes)}</p>` : ""}<button class="btn" data-show="${id}">Show in Stats</button><button class="btn danger" data-del="${id}">${pendingDel === s.id ? "Tap again to delete" : "Delete"}</button></div>` : ""}</div>`;
}
function renderShots() {
  const v = $("view-shots");
  const hasEx = shots.some(s => s.example);
  const head = `<div class="row"><button class="btn primary" id="exportCsv">Export CSV</button><button class="btn" id="copyCsv">Copy CSV</button>${hasEx ? `<button class="btn" id="clearEx">Remove examples</button>` : ""}</div><textarea id="csvBox" rows="6" hidden aria-label="CSV text"></textarea>`;
  if (!shots.length) { v.innerHTML = head + emptyState("No shots logged", "Every shot you save appears here, newest first. Export them as CSV for your own analysis."); return; }
  if (openShot && !shots.some(s => s.id === openShot)) openShot = null;
  const nb = shots.filter(isBrk).length, ns = shots.length - nb;
  const groups = new Map();
  for (const s of shots.slice().reverse()) { const k = sessionOf(s); (groups.get(k) || groups.set(k, []).get(k)).push(s); }
  const sess = sessions().filter(x => groups.has(x.id));
  v.innerHTML = head + `<p class="note">${ns} shot${ns === 1 ? "" : "s"}${nb ? ` and ${nb} break${nb === 1 ? "" : "s"}` : ""}, newest first. Tap one to see it in Stats or delete it.</p>` +
    sess.map(x => {
      const list = groups.get(x.id), names = [...new Set(list.map(s => isBrk(s) ? "Cut break" : s.drill || "Unnamed drill"))];
      return `<h2 class="sesshead"><b>${esc(sessionLabel(x.start))}</b><span>${list.length} · ${esc(names.slice(0, 2).join(", "))}${names.length > 2 ? ` +${names.length - 2}` : ""}</span></h2><div class="shotlist">${list.map(shotRow).join("")}</div>`;
    }).join("");
}
/* Open Stats filtered to this shot's session, with the shot picked on the table chart. */
function showShotInStats(id) {
  const s = shots.find(x => x.id === id); if (!s) return;
  if (isBrk(s)) { statsMode = "break"; BF.session = sessionOf(s); BF.rack = "all"; BF.pocket = "all"; selBrk = id; }
  else { statsMode = "shot"; F.drill = "__all"; F.vspin = "all"; F.session = sessionOf(s); selShot = id; }
  setView("stats");
  const el = $(isBrk(s) ? "brkScatter" : "scatter"); if (el) try { el.scrollIntoView({ block: "center" }); } catch (e) {}
}
