// The Settings tab.
/* ---------- settings ---------- */
const CLOTH_PRESETS = [["#8a9399", "Grey (yours)"], ["#2f6fa6", "Tournament blue"], ["#2a86c9", "Electric blue"], ["#2e7d4f", "Green"], ["#1d5a39", "English green"],
  ["#7a2633", "Burgundy"], ["#b23a3a", "Red"], ["#5b3c88", "Purple"], ["#b08d5f", "Camel"], ["#2a2c2e", "Black"]];
const WOOD_PRESETS = [["#2b2723", "Dark (yours)"], ["#161514", "Black"], ["#3b2a20", "Dark walnut"], ["#5a2a1e", "Mahogany"], ["#7a3b26", "Cherry"],
  ["#9a7148", "Oak"], ["#c59d6b", "Maple"], ["#9aa0a6", "Silver"], ["#e6e3dc", "White"]];
const RAIL_SHADE = .835;   // cushions are covered in the same cloth, a little darker in the light
const COLOR_ROWS = [["cloth", "Table cloth", CLOTH_PRESETS], ["cushion", "Rails (cushions)", CLOTH_PRESETS.map(([h, n]) => [shade(h, RAIL_SHADE), n])], ["rail", "Wood (outer rails)", WOOD_PRESETS]];
function colorBlock([key, title, presets]) {
  const cur = (settings[key] || COLOR_DEFAULTS[key]).toLowerCase();
  return `<div class="colorblock"><span class="label">${title}</span>
    <div class="swatches">${presets.map(([h, n]) => `<button class="sw" style="background:${h}" title="${esc(n)}" aria-label="${esc(n)}" aria-pressed="${cur === h}" data-sw="${key}" data-hex="${h}"></button>`).join("")}</div>
    <div class="colorrow"><input type="color" id="pick-${key}" value="${cur}" aria-label="${title}: colour wheel"><input type="text" id="hex-${key}" value="${cur}" maxlength="7" spellcheck="false" autocomplete="off" aria-label="${title}: hex code"></div></div>`;
}
function setColor(key, hex, fromCloth) {
  hex = hex.toLowerCase(); settings[key] = hex;
  if (key === "cloth" && fromCloth) settings.cushion = shade(hex, RAIL_SHADE);
  saveSettings(); applyAppearance();
}
function renderSettings() {
  const m = isMetric(), u = uName(), sv = v => +fmt(toU(v), m ? 1 : 2);
  $("view-settings").innerHTML = `
  <div class="panel">
    <h3>Feedback</h3>
    <p class="note">Found a bug, got confused, or have an idea? It takes a minute, and every reply is read. The app version and your phone type are filled in for you.</p>
    <div class="row"><a class="btn primary" id="fbSettings" href="#" target="_blank" rel="noopener">Send feedback</a></div>
    <p class="note" style="margin:0">App version ${esc(APP_VERSION)}</p>
  </div>
  <div class="panel">
    <h3>Display</h3>
    <span class="label">Theme</span>
    <div class="chips">${[["system", "Match phone"], ["light", "Light"], ["dark", "Dark"]].map(([k, l]) => `<button class="chip" aria-pressed="${settings.theme === k}" data-theme-set="${k}">${l}</button>`).join("")}</div>
    <span class="label">Units</span>
    <div class="chips">${[["imperial", "Imperial (in)"], ["metric", "Metric (cm)"]].map(([k, l]) => `<button class="chip" aria-pressed="${settings.units === k}" data-units="${k}">${l}</button>`).join("")}</div>
    <p class="note">Units apply everywhere, including the CSV: in metric its distance columns end in _cm instead of _in. If you mix exports, check the column names.</p>
  </div>
  <div class="panel">
    <h3>Table colours</h3>
    ${COLOR_ROWS.map(colorBlock).join("")}
    <p class="note">Picking a cloth swatch also sets the rails to a slightly darker shade of it, the way covered cushions look. Change the rails on their own after that if yours differ.</p>
    <div class="row"><button class="btn small" id="resetColors">Back to my grey table</button></div>
  </div>
  <div class="panel">
    <h3>Table size</h3>
    <div class="fields">
      <label class="field">Playing length (${u})<input id="sL" type="number" inputmode="decimal" step="${m ? 1 : .5}" value="${sv(settings.L)}"></label>
      <label class="field">Playing width (${u})<input id="sW" type="number" inputmode="decimal" step="${m ? 1 : .5}" value="${sv(settings.W)}"></label>
      <label class="field">Corner pocket mouth (${u})<input id="sWc" type="number" inputmode="decimal" step="${m ? .1 : .05}" value="${sv(settings.wc)}"></label>
      <label class="field">Side pocket mouth (${u})<input id="sWs" type="number" inputmode="decimal" step="${m ? .1 : .05}" value="${sv(settings.ws)}"></label>
    </div>
    <p class="note">Set for your Rasson Accura: ${m ? "254 × 127 cm" : "100 × 50 in"} cushion to cushion, ${m ? "10.8 cm" : "4.25 in"} corner and ${m ? "12.1 cm" : "4.75 in"} side pocket mouths, measured jaw tip to jaw tip.</p>
  </div>
  <div class="panel">
    <h3>Zones</h3>
    <div class="chips" id="gridChips">${[["off", "No grid"], ["8x4", "8 × 4 (diamonds)"], ["16x8", "16 × 8 (half diamonds)"]].map(([k, l]) => `<button class="chip" aria-pressed="${settings.grid === k}" data-g="${k}">${l}</button>`).join("")}</div>
    <div class="chips"><button class="chip" id="lblToggle" aria-pressed="${settings.labels}">Show zone names</button></div>
    <p class="note">Zones are named by column letter from the left (seen from the head end) and row number from the head rail, so A1 is the head-left corner. Exact coordinates are always saved too.</p>
  </div>
  <div class="panel">
    <h3>My drills</h3>
    ${myDrills.length ? `<div class="shotlist">${myDrills.map(d => `<div class="shot"><span class="n"></span><span class="l1">${esc(d.name)}</span><button class="btn danger del" data-deldrill="${esc(d.id)}">${pendingDel === d.id ? "Confirm" : "Delete"}</button><span class="l2">${d.ob ? esc(POCKET_NAMES[d.pocket] || "") + " pocket" : "Position only"} · ${label(VLAB, d.tip ? vspinOf(d.tip) : d.vspin)}</span></div>`).join("")}</div>` : `<p class="note">None yet. On the Log tab, set up the balls in Free practice and tap Save as drill.</p>`}
  </div>
  <div class="panel">
    <h3>Your data</h3>
    <p class="note" id="dataNote">${store.mode === "cloud" ? "Shots sync to your Claude account through this page." : "Shots are stored in this browser on this device. If the browser's data is cleared, they are gone, so keep a backup."}</p>
    <div class="row"><button class="btn" id="loadEx">Add 20 example shots</button><button class="btn danger" id="clearAll">${pendingDel === "__all" ? "Tap again to delete all" : "Delete all shots"}</button></div>
  </div>
  <div class="panel" id="backupPanel">
    <h3>Backup</h3>
    <p class="note">One file with everything: ${shots.filter(s => !isBrk(s)).length} shots, ${shots.filter(isBrk).length} breaks, ${myDrills.length} drills, your settings and your table tuning. Keep it in your files or cloud drive; restore it here or on a new phone. ${settings.lastBackup ? `Last backup: <b>${esc(new Date(settings.lastBackup).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }))}</b>.` : "<b>No backup yet.</b>"}</p>
    <div class="row"><button class="btn primary" id="backupSave">Save backup file</button><button class="btn" id="backupCopy">Copy backup</button></div>
    <textarea id="backupBox" rows="4" hidden aria-label="Backup text"></textarea>
    <div class="row"><label class="btn" for="restoreFile">Restore from a file…</label><input type="file" id="restoreFile" accept=".json,application/json" hidden><button class="btn" id="restorePasteToggle">Paste a backup</button></div>
    <div id="restorePaste" hidden><textarea id="restoreText" rows="4" placeholder="Paste the backup text here" aria-label="Backup text to restore"></textarea><div class="row"><button class="btn" id="restoreRead">Read it</button></div></div>
    ${pendingRestore ? `<div class="restorebox" role="group" aria-label="Restore this backup">
      <p><b>Backup from ${esc(new Date(pendingRestore.created).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }))}</b><br>${esc(backupSummary(pendingRestore))}.</p>
      <p class="note">Add keeps everything here and adds the records you don't have. Replace deletes what's here first. Both use the backup's settings and tuning.</p>
      <div class="row"><button class="btn primary" id="restoreMerge">Add to what's here</button><button class="btn danger" id="restoreReplace">${pendingDel === "__restore" ? "Tap again to replace" : "Replace everything"}</button><button class="btn" id="restoreCancel">Cancel</button></div>
    </div>` : ""}
  </div>
  <div class="panel">
    <h3>Coordinates in the CSV</h3>
    <p class="note">x is ${isMetric() ? "centimetres" : "inches"} from the left long cushion, y is ${isMetric() ? "centimetres" : "inches"} from the head cushion, both measured to the ball's centre, with the table seen from the head end. The cut angle is + for a cut to the right. Pocket offset is + when the object ball entered right of the pocket centre, looking from where the object ball started. Tip x and y are where the cue tip hit, in cue ball radii from centre (+ is right and up), and speed_pct is the 0 to 100% bar.</p>
  </div>`;
}
function applySettings() {
  const num = (id, d, lo, hi) => { const v = parseFloat($(id).value); return isNaN(v) ? d : Math.min(hi, Math.max(lo, fromU(v))); };
  settings.L = num("sL", 100, 40, 140); settings.W = num("sW", 50, 20, 70); settings.wc = num("sWc", 4.25, 3.5, 6); settings.ws = num("sWs", 4.75, 4, 6.5);
  saveSettings(); buildTable(); renderLog();
}
