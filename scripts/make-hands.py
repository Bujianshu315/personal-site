# -*- coding: utf-8 -*-
"""诺基亚 "Connecting People" 致敬：大人手 + 小孩手剪影 -> ASCII 字符画帧。
生成 3 个关键帧：伸入 / 轻触 / 扣握 -> src/data/hands-ascii.json
用法：python scripts/make-hands.py
"""
import math
import json
import pathlib
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
W, H = 1100, 400
# 亮 -> 暗（白底 -> 空格；手剪影 -> 最重字符）
RAMP = " .·:;=+*x%#@"


def finger(d, x0, y0, x1, y1, w):
    """圆头粗线 = 手指。"""
    d.line([x0, y0, x1, y1], fill=0, width=w)
    for (x, y) in ((x0, y0), (x1, y1)):
        r = w / 2
        d.ellipse([x - r, y - r, x + r, y + r], fill=0)


def big_hand(d, ox=0.0, oy=0.0):
    """大人手：前臂从左缘略上扬伸入，掌摊开，五指修长分叉朝右。"""
    # 前臂（细臂，微上扬）
    d.polygon([(0, 262), (318 + ox, 246 + oy), (318 + ox, 300 + oy), (0, 318)], fill=0)
    # 手掌（掌长明显大于掌宽）
    d.ellipse([300 + ox, 200 + oy, 462 + ox, 312 + oy], fill=0)
    # 五指：分叉角大（±38°），指细长，间隙明显
    cx, cy = 436 + ox, 246 + oy
    spec = [(-38, 140, 18), (-19, 180, 20), (0, 200, 22), (19, 180, 20), (38, 140, 18)]
    for deg, ln, wd in spec:
        a = math.radians(deg)
        finger(d, cx, cy, cx + math.cos(a) * ln, cy + math.sin(a) * ln, wd)


def small_hand(d, ox=0.0, oy=0.0, curl=0.0):
    """小孩手：约为大人手 0.55 倍，前臂从右缘伸入，五指朝左，curl 控制下扣。"""
    # 前臂（细）
    d.polygon([(W, 214 + oy), (W - 150 + ox, 219 + oy),
               (W - 150 + ox, 253 + oy), (W, 264 + oy)], fill=0)
    # 手掌
    d.ellipse([W - 196 + ox, 196 + oy, W - 90 + ox, 266 + oy], fill=0)
    # 五指（分叉角大）
    cx, cy = W - 136 + ox, 226 + oy
    spec = [(180 + 38 + curl, 70, 11), (180 + 19 + curl, 90, 13),
            (180 + curl, 100, 14), (180 - 19 + curl, 90, 13), (180 - 38 + curl, 70, 11)]
    for deg, ln, wd in spec:
        a = math.radians(deg)
        finger(d, cx, cy, cx + math.cos(a) * ln, cy + math.sin(a) * ln, wd)


def to_ascii(img, cols=150):
    w, h = img.size
    rows = max(8, round(cols * (h / w) * 0.55))  # 0.55 补偿字符 cell 高宽比
    cw, ch = w / cols, h / rows
    px = img.load()
    out = []
    for r in range(rows):
        line = ""
        for c in range(cols):
            tot = n = 0
            y0, y1 = int(r * ch), min(h, int((r + 1) * ch))
            x0, x1 = int(c * cw), min(w, int((c + 1) * cw))
            for y in range(y0, y1, 2):
                for x in range(x0, x1, 2):
                    tot += px[x, y]
                    n += 1
            v = (tot / n) / 255 if n else 1
            # 转成"暗度"（0=白底 1=黑手）：暗部用重字符、亮部留白——ASCII 艺术的正确方向
            v = 1 - max(0.0, min(1.0, (v - 0.04) / 0.92))
            line += RAMP[round(v * (len(RAMP) - 1))]
        out.append(line)
    return out


def render(ox, oy, curl):
    img = Image.new("L", (W, H), 255)
    d = ImageDraw.Draw(img)
    big_hand(d)
    small_hand(d, ox=ox, oy=oy, curl=curl)
    return img


# 三帧：伸入(指尖相距一大截) / 轻触(刚好碰到) / 扣握(小手搭上大手并下扣)
FRAMES = [
    dict(ox=-52, oy=-10, curl=0),
    dict(ox=-256, oy=0, curl=3),
    dict(ox=-316, oy=22, curl=22),
]

frames = [to_ascii(render(**f)) for f in FRAMES]
out = ROOT / "src" / "data" / "hands-ascii.json"
out.write_text(json.dumps({"frames": frames}, ensure_ascii=False), encoding="utf-8")
print(f"hands-ascii.json 已生成：{len(frames)} 帧，每帧 {len(frames[0])} 行 x {len(frames[0][0])} 列")
