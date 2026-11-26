#!/usr/bin/env python3
"""Draw the app icons: grey cloth, a cue ball and a yellow 1-ball. Run once; PNGs are committed."""
import pathlib
from PIL import Image, ImageDraw

OUT = pathlib.Path(__file__).resolve().parent.parent / "src"
RAIL, CLOTH, YEL, WHITE, INK = (43, 39, 35), (138, 147, 153), (242, 183, 5), (251, 250, 244), (27, 27, 27)

def icon(size, maskable=False):
    s = size * 4
    im = Image.new("RGBA", (s, s), RAIL if maskable else (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pad = 0 if maskable else int(s * .04)
    if not maskable:
        d.rounded_rectangle([pad, pad, s - pad, s - pad], radius=int(s * .22), fill=RAIL)
    inset = int(s * (.2 if maskable else .13))
    d.rounded_rectangle([inset, inset, s - inset, s - inset], radius=int(s * .08), fill=CLOTH)
    r = int(s * .13)
    ob = (int(s * .6), int(s * .38)); cb = (int(s * .4), int(s * .63))
    d.line([cb, ob], fill=(255, 255, 255), width=int(s * .012))
    d.ellipse([ob[0] - r, ob[1] - r, ob[0] + r, ob[1] + r], fill=YEL, outline=INK, width=int(s * .012))
    d.ellipse([ob[0] - r * .45, ob[1] - r * .45, ob[0] + r * .45, ob[1] + r * .45], fill=WHITE)
    d.ellipse([cb[0] - r, cb[1] - r, cb[0] + r, cb[1] + r], fill=WHITE, outline=INK, width=int(s * .012))
    d.ellipse([cb[0] - r * .16, cb[1] - r * .16, cb[0] + r * .16, cb[1] + r * .16], fill=(194, 59, 46))
    return im.resize((size, size), Image.LANCZOS)

icon(192).save(OUT / "icon-192.png")
icon(512).save(OUT / "icon-512.png")
icon(512, maskable=True).save(OUT / "icon-maskable-512.png")
print("icons written")
