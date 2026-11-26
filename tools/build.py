#!/usr/bin/env python3
"""Build the installable web app (PWA) from src/app.html into dist/.

src/app.html is a page fragment (title, styles, markup, script). The same
fragment is published as a claude.ai preview; here it is wrapped in a full
document with a web app manifest, icons and an offline service worker.
"""
import hashlib, json, pathlib, shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, DIST = ROOT / "src", ROOT / "dist"

def main():
    frag = (SRC / "app.html").read_text(encoding="utf-8")
    version = hashlib.sha256(frag.encode()).hexdigest()[:10]
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    head = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#2b2723">
<meta name="description" content="Log pool practice shots: cue ball position, pocket entry, spin and speed. Export CSV.">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-192.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
"""
    tail = """
<script>
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
</script>
</body>
</html>
"""
    (DIST / "index.html").write_text(head + frag + tail, encoding="utf-8")
    sw = (SRC / "sw.js").read_text(encoding="utf-8").replace("__VERSION__", version)
    (DIST / "sw.js").write_text(sw, encoding="utf-8")
    shutil.copy(SRC / "manifest.webmanifest", DIST / "manifest.webmanifest")
    for icon in SRC.glob("icon-*.png"):
        shutil.copy(icon, DIST / icon.name)
    (DIST / ".nojekyll").write_text("")
    print(f"Built dist/ (version {version})")

if __name__ == "__main__":
    main()
