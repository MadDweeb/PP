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
    <h2>Feedback</h2>
    <p class="note">Found a bug, confused about something, or have a suggestion? Send me feedback via a short Google Forms survey with the button below, and I'll do my best to apply the change to your satisfaction. The app version and your phone type are filled in to help with debugging; no other personal data is taken.</p>
    <div class="row"><a class="btn primary" id="fbSettings" href="#" target="_blank" rel="noopener">Send feedback</a></div>
    <p class="note" style="margin:0">App version ${esc(APP_VERSION)}</p>
  </div>
  <div class="panel">
    <h2>Display</h2>
    <span class="label">Theme</span>
    <div class="chips">${[["system", "Match phone"], ["light", "Light"], ["dark", "Dark"]].map(([k, l]) => `<button class="chip" aria-pressed="${settings.theme === k}" data-theme-set="${k}">${k === "system" ? `<svg class="halfmoon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="#ffffff" stroke="#15171a" stroke-width="1.5"/><path d="M10 2a8 8 0 0 1 0 16z" fill="#15171a"/></svg>${l}` : l}</button>`).join("")}</div>
    <span class="label">Units</span>
    <div class="chips">${[["imperial", "Imperial (in)"], ["metric", "Metric (cm)"]].map(([k, l]) => `<button class="chip" aria-pressed="${settings.units === k}" data-units="${k}">${l}</button>`).join("")}</div>
    <p class="note">Double-check the units when exporting data, so you don't mix them.</p>
  </div>
  <div class="panel">
    <h2>At the table</h2>
    <label class="switchrow"><span>Keep the screen on<small>While the Log tab is open, so the phone doesn't lock between shots</small></span><input type="checkbox" id="setWake" ${settings.wakeLock !== false ? "checked" : ""} ${wakeSupported() ? "" : "disabled"}></label>
    ${wakeSupported() ? "" : `<p class="note">This browser can't keep the screen on.${isIOS() ? " iPhones can from iOS 16.4: update iOS, or set Auto-Lock to Never while you practise." : " Chrome on Android can."}</p>`}
    <label class="switchrow"><span>Vibrate when a shot saves<small>A short tick, so you know it saved without looking</small></span><input type="checkbox" id="setHaptics" ${settings.haptics !== false ? "checked" : ""} ${vibrateSupported() ? "" : "disabled"}></label>
    ${vibrateSupported() ? "" : `<p class="note">${isIOS() ? "iPhones don't let web apps vibrate." : "This browser can't vibrate."}</p>`}
  </div>
  <div class="panel">
    <h2>Table colours</h2>
    ${COLOR_ROWS.map(colorBlock).join("")}
    <p class="note">Picking a cloth swatch also sets the rails to a slightly darker shade of it, the way covered cushions look. Change the rails on their own after that if yours differ.</p>
    <div class="row"><button class="btn small" id="resetColors">Revert to default</button></div>
  </div>
  <div class="panel">
    <h2>Table size</h2>
    <div class="fields">
      <label class="field">Playing length (${u})<input id="sL" type="number" inputmode="decimal" step="${m ? 1 : .5}" value="${sv(settings.L)}"></label>
      <label class="field">Playing width (${u})<input id="sW" type="number" inputmode="decimal" step="${m ? 1 : .5}" value="${sv(settings.W)}"></label>
      <label class="field">Corner pocket mouth (${u})<input id="sWc" type="number" inputmode="decimal" step="${m ? .1 : .05}" value="${sv(settings.wc)}"></label>
      <label class="field">Side pocket mouth (${u})<input id="sWs" type="number" inputmode="decimal" step="${m ? .1 : .05}" value="${sv(settings.ws)}"></label>
    </div>
    <p class="note">Set for your Rasson Accura: ${m ? "254 × 127 cm" : "100 × 50 in"} cushion to cushion, ${m ? "10.8 cm" : "4.25 in"} corner and ${m ? "12.1 cm" : "4.75 in"} side pocket mouths, measured jaw tip to jaw tip.</p>
    <div class="row"><button class="btn small" id="resetSize">Revert to default</button></div>
  </div>
  <div class="panel">
    <h2>Zones</h2>
    <div class="chips" id="gridChips">${[["off", "No grid"], ["8x4", "8 × 4 (diamonds)"], ["16x8", "16 × 8 (half diamonds)"]].map(([k, l]) => `<button class="chip" aria-pressed="${settings.grid === k}" data-g="${k}">${l}</button>`).join("")}</div>
    <div class="chips"><button class="chip" id="lblToggle" aria-pressed="${settings.labels}">Show zone names</button></div>
  </div>
  <div class="panel">
    <h2>My drills</h2>
    ${myDrills.length ? `<div class="shotlist">${myDrills.map(d => `<div class="shot"><span class="n"></span><span class="l1">${esc(d.name)}</span><button class="btn danger del" data-deldrill="${esc(d.id)}">${pendingDel === d.id ? "Confirm" : "Delete"}</button><span class="l2">${d.ob ? esc(POCKET_NAMES[d.pocket] || "") + " pocket" : "Position only"} · ${label(VLAB, d.tip ? vspinOf(d.tip) : d.vspin)}</span></div>`).join("")}</div>` : `<p class="note">None yet. On the Log tab, set up the balls in Free practice and tap Save as drill.</p>`}
  </div>
  <div class="panel">
    <h2>Your data</h2>
    <p class="note" id="dataNote">${store.mode === "cloud" ? "Shots sync to your Claude account through this page." : "Shots are stored in this browser on this device. If the browser's data is cleared, they are gone, so keep a backup." + (isIOS() && !isInstalled() ? " <b>On iPhone, add the app to your Home Screen</b> (Share, then Add to Home Screen): Safari can clear a website's data after about a week without a visit, but not a Home Screen app's." : "")}</p>
    <div class="row"><button class="btn" id="loadEx">Add 20 example shots</button></div>
  </div>
  <div class="panel" id="backupPanel">
    <h2>Backup</h2>
    <p class="note">Everything in one go: <b>${shots.filter(s => !isBrk(s)).length} shots</b>, <b>${shots.filter(isBrk).length} breaks</b>, <b>${myDrills.length} drills</b>, your settings and your table tuning. Restore it here or on a new phone.</p>
    <p class="note">${settings.lastBackup ? `Last backup: <b>${esc(new Date(settings.lastBackup).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }))}</b>` : "<b>No backup yet.</b>"}</p>
    <ul class="notelist">
      <li><b>Save backup file</b> saves a .json file. Keep it in your files or cloud drive, then use <b>Restore from a file</b> to open it.</li>
      <li><b>Copy backup</b> copies the same backup as text. Paste it somewhere safe, such as a note or a chat to yourself, then use <b>Paste a backup</b> to bring it back.</li>
      <li>Both hold exactly the same data. After either one, you choose <b>Add</b> or <b>Replace</b>.</li>
    </ul>
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
    <h2>Coordinates in the CSV</h2>
    <p class="note">Measured to the ball's centre, with the table seen from the head end.</p>
    <ul class="notelist">
      <li><b>x</b>: <b>${isMetric() ? "cm" : "inches"}</b> from the left long cushion</li>
      <li><b>y</b>: <b>${isMetric() ? "cm" : "inches"}</b> from the head cushion</li>
      <li><b>Cut angle</b>: <b>+</b> is a cut to the right</li>
      <li><b>Pocket offset</b>: <b>+</b> is right of the pocket centre, seen from where the object ball started</li>
      <li><b>Tip x, y</b>: where the tip hit, in <b>cue ball radii</b> from centre (<b>+</b> is right and up)</li>
      <li><b>speed_pct</b>: the speed bar, <b>0 to 100%</b></li>
    </ul>
  </div>
  <div class="panel danger">
    <h2>Delete all shots</h2>
    <p class="note">Removes every shot and break${store.mode === "cloud" ? " from your account" : " from this device"}. It can't be undone, so save a backup first. Your drills and settings stay.</p>
    <div class="row"><button class="btn danger" id="clearAll">${pendingDel === "__all" ? "Tap again to delete all" : "Delete all shots"}</button></div>
  </div>`;
}
function applySettings() {
  const num = (id, d, lo, hi) => { const v = parseFloat($(id).value); return isNaN(v) ? d : Math.min(hi, Math.max(lo, fromU(v))); };
  settings.L = num("sL", 100, 40, 140); settings.W = num("sW", 50, 20, 70); settings.wc = num("sWc", 4.25, 3.5, 6); settings.ws = num("sWs", 4.75, 4, 6.5);
  saveSettings(); buildTable(); renderLog();
}
