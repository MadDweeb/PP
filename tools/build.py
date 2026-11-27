#!/usr/bin/env python3
"""Build the app from its source files into dist/.

The source is split by job (see README "Code layout"). This script stitches it back together:

  dist/app.html   one self-contained page fragment (styles, markup, scripts). This is what gets
                  published as the Claude preview.
  dist/index.html the same fragment wrapped in a full document with the web app manifest, icons
                  and the offline service worker. This is what GitHub Pages serves.

The app's JavaScript files are joined, in the order of JS_ORDER, inside one function, so they
share their names exactly as when everything lived in one file.
"""
import hashlib, pathlib, shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, DIST = ROOT / "src", ROOT / "dist"

# The order matters: a file can use names from files above it while the page loads.
JS_ORDER = [
    "constants.js", "state.js", "util.js", "appearance.js", "geometry.js",
    "rules.js", "table.js", "log.js", "records.js", "csv.js", "export.js", "feedback.js",
    "backup.js", "stats.js", "stats-breaks.js", "shots-list.js", "settings-view.js",
    "examples.js", "cutbreak.js", "simulator.js", "play.js", "views.js", "device.js", "events.js", "boot.js",
]
# Files with no side effects when loaded, so the tests can load them without a page.
CORE = ["constants.js", "util.js", "geometry.js", "rules.js", "csv.js", "backup.js", "stats.js", "stats-breaks.js"]


def read(rel):
    return (SRC / rel).read_text(encoding="utf-8")


def app_js():
    listed = set(JS_ORDER)
    found = {p.name for p in (SRC / "js").glob("*.js")}
    if found != listed:
        raise SystemExit(f"src/js and JS_ORDER differ: missing {sorted(listed - found)}, unlisted {sorted(found - listed)}")
    return "".join(read("js/" + name) for name in JS_ORDER)


def fragment():
    return (read("head.html") + "<style>\n" + read("styles.css") + "</style>\n\n" + read("markup.html") +
            "\n<script>\n" + read("physics.js") + "</script>\n<script>\n(() => {\n\"use strict\";\n" + app_js() + "})();\n</script>\n")


def version():
    # Changes whenever any shipped file changes, so phones fetch the new service worker and cache.
    h = hashlib.sha256()
    for f in sorted(p for p in SRC.rglob("*") if p.is_file()):
        h.update(str(f.relative_to(SRC)).encode()); h.update(f.read_bytes())
    return h.hexdigest()[:10]


def main():
    frag, ver = fragment(), version()
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
    (DIST / "app.html").write_text(frag, encoding="utf-8")
    (DIST / "index.html").write_text(head + frag + tail, encoding="utf-8")
    (DIST / "sw.js").write_text(read("sw.js").replace("__VERSION__", ver), encoding="utf-8")
    shutil.copy(SRC / "manifest.webmanifest", DIST / "manifest.webmanifest")
    for icon in SRC.glob("icon-*.png"):
        shutil.copy(icon, DIST / icon.name)
    (DIST / ".nojekyll").write_text("")
    print(f"Built dist/ (version {ver})")


if __name__ == "__main__":
    main()
