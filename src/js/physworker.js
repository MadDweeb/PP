// Running the ball physics off the page's main thread, so dragging the aim stays smooth on a slow phone while the
// predicted paths are worked out. The worker is made from the page's own copy of the physics (the script tagged
// physSrc), so it is always the same code and gives exactly the same result as running it on the page.
/* Where the browser refuses a worker (an embedded preview may), everything runs on the page as before. */
let physW = null, physWOk = true, physJob = null;
const physWait = new Map();   // the newest request still waiting, for each caller: an older one is no longer wanted
function physWorker() {
  if (physW || !physWOk) return physW;
  try {
    const src = $("physSrc") && $("physSrc").textContent;
    if (!src || typeof Worker === "undefined" || typeof Blob === "undefined" || !window.URL) throw new Error("no worker");
    const glue = "\nself.onmessage = e => { const d = e.data; let r = null;" +
      " try { const o = self.PoolPhysics.simulate(d.spec, d.params); r = { balls: o.balls, t: o.t }; } catch (err) {}" +
      " self.postMessage({ id: d.id, r }); };\n";
    const url = URL.createObjectURL(new Blob([src, glue], { type: "text/javascript" }));
    physW = new Worker(url);
    URL.revokeObjectURL(url);
    physW.onmessage = e => physDone(e.data);
    physW.onerror = physFail;
  } catch (e) { physW = null; physWOk = false; }
  return physW;
}
/* the worker could not start or broke: run what was asked on the page, and from now on everything */
function physFail() {
  if (physW) { try { physW.terminate(); } catch (e) {} }
  physW = null; physWOk = false;
  const jobs = (physJob ? [physJob] : []).concat([...physWait.values()]); physJob = null; physWait.clear();
  for (const j of jobs) { let r = null; try { r = window.PoolPhysics.simulate(j.spec, j.params); } catch (e) {} if (r) j.cb(r); }
}
let physSeq = 0;
/* Ask for one run; cb(result) is called when it is done. One run at a time: a newer request from the same caller
   replaces its older one still waiting. Returns false when there is no worker, and the caller runs it itself. */
function physAsk(who, spec, params, cb) {
  const w = physWorker(); if (!w) return false;
  const job = { id: ++physSeq, who, spec, params, cb };
  if (physJob) physWait.set(who, job);
  else physSend(job);
  return true;
}
function physSend(job) {
  physJob = job;
  try { physW.postMessage({ id: job.id, spec: job.spec, params: job.params }); } catch (e) { physFail(); }
}
function physDone(d) {
  const j = physJob; physJob = null;
  const next = physWait.values().next().value;
  if (next) { physWait.delete(next.who); physSend(next); }
  if (!j || !d || j.id !== d.id) return;
  let r = d.r;   // the worker failed on this one: try it on the page
  if (!r) { try { r = window.PoolPhysics.simulate(j.spec, j.params); } catch (e) {} }
  if (r) j.cb(r);
}
