# -*- coding: utf-8 -*-
"""ASCII 美感自检：把 avatar-ascii.json 和 hands-ascii.json 用等宽字体渲染成 PNG。
银幕配色（暗场提亮后）模拟真实显示效果。产出 .fontwork/check.png
用法：python scripts/render-check.py
"""
import json
import pathlib
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT = "C:/Windows/Fonts/consola.ttf"
FS = 16          # 字号
CW = int(FS * 0.62)
CH = int(FS * 1.12)
SCREEN = "#b7e3d8"   # 提亮后的银幕色
INK = "#14333b"


def crop(rows):
    r0, r1, c0, c1 = len(rows), -1, 10**9, -1
    for r, row in enumerate(rows):
        for c, ch in enumerate(row):
            if ch != " ":
                r0, r1 = min(r0, r), max(r1, r)
                c0, c1 = min(c0, c), max(c1, c)
    if r1 < 0:
        return rows
    return [row[c0:c1 + 1] for row in rows[r0:r1 + 1]]


def render_rows(d, rows, ox, oy, color=INK):
    d.font = ImageFont.truetype(FONT, FS)
    d_fill = color
    for r, row in enumerate(rows):
        d.text((ox, oy + r * CH), row, fill=d_fill, font=d.font)


avatar = json.loads((ROOT / "src/data/avatar-ascii.json").read_text(encoding="utf-8"))["rows"]
hands = json.loads((ROOT / "src/data/hands-ascii.json").read_text(encoding="utf-8"))["frames"]

av = crop(avatar)
av_w, av_h = len(av[0]) * CW, len(av) * CH
hand_cols = max(len(f[0]) for f in hands)
pad = 24
img = Image.new("RGB", (max(av_w, hand_cols * CW) + pad * 2 + 90, av_h + sum(len(f) * CH for f in hands) + 3 * CH + pad * 3), SCREEN)
d = ImageDraw.Draw(img)

render_rows(d, av, pad, pad)
y = pad + av_h + CH
for i, f in enumerate(hands):
    render_rows(d, f, pad, y)
    d.text((pad + hand_cols * CW + 8, y + 4), f"frame {i}", fill="#ee6fa4", font=ImageFont.truetype(FONT, 12))
    y += len(f) * CH + CH

out = ROOT / ".fontwork" / "check.png"
out.parent.mkdir(exist_ok=True)
img.save(out)
print(f"check.png -> {out}  size={img.size}")
