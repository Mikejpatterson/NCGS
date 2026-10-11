"""Make synthetic photos of filled-in scorecards for testing the scorecard check.

Modelled on real club cards:
  - Irish/UK style: holes run DOWN the card (1-9), player columns A B C D across the top.
  - Spanish style: holes run ACROSS (10-18), player rows A B C D down the side, labels in Spanish.
Players are named only in the key at the top ("Player A ___ H'cap __"); the grid just says A B C D.
Writing is in pencil: grey graphite, smaller, grainy, with rubbed-out corrections.
Every card has an answer key so a reader can be scored.
Usage: python3 tools/make_test_cards.py OUT_DIR
"""
import json
import math
import random
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else 'cards')
OUT.mkdir(parents=True, exist_ok=True)

PAR = [4, 4, 4, 4, 4, 4, 3, 4, 4, 4, 4, 5, 3, 5, 3, 4, 4, 4]
SI = [15, 13, 5, 17, 1, 9, 7, 11, 3, 8, 6, 4, 16, 2, 14, 12, 10, 18]
MET = [309, 275, 288, 243, 378, 264, 152, 277, 327, 327, 336, 391, 134, 456, 135, 305, 268, 305]
SANS = '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
SANS_B = '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'
ITAL = '/usr/share/fonts/truetype/google-fonts/Lora-Italic-Variable.ttf'
GRAPHITE = (58, 60, 66)


def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.truetype(SANS, size)


# ---------- handwriting strokes (unit box, y down) ----------
GLYPHS = {
    '0': [[(.5, 0), (.15, .2), (.1, .6), (.3, 1), (.7, 1), (.9, .6), (.85, .2), (.5, 0), (.4, .05)]],
    '1': [[(.3, .22), (.55, 0), (.55, 1)]],
    '2': [[(.1, .25), (.3, .02), (.7, .02), (.88, .25), (.75, .52), (.1, 1), (.92, .98)]],
    '3': [[(.12, .12), (.45, 0), (.8, .12), (.78, .36), (.45, .48), (.82, .6), (.86, .85), (.5, 1), (.1, .9)]],
    '4': [[(.66, 1), (.66, 0), (.05, .68), (.95, .68)]],
    '4like9': [[(.72, .05), (.4, 0), (.15, .1), (.1, .5), (.72, .5)], [(.72, 0), (.74, 1)]],
    '5': [[(.25, .03), (.2, .45), (.55, .38), (.86, .6), (.8, .9), (.45, 1), (.1, .86)], [(.25, .03), (.86, 0)]],
    '6': [[(.78, 0), (.35, .3), (.15, .7), (.3, .98), (.65, .98), (.84, .72), (.6, .5), (.3, .55), (.17, .72)]],
    '7': [[(.06, .03), (.94, .02), (.4, 1)]],
    '8': [[(.5, .48), (.2, .28), (.3, .02), (.7, .02), (.8, .28), (.5, .48), (.14, .74), (.3, 1), (.7, 1), (.86, .74), (.5, .48)]],
    '9': [[(.82, .3), (.62, .04), (.3, .04), (.15, .3), (.35, .52), (.78, .4), (.82, .3), (.74, 1)]],
    '3messy': [[(.2, .05), (.55, 0), (.75, .2), (.5, .45), (.3, .48), (.75, .58), (.8, .9), (.45, 1.02), (.2, .85), (.32, .74)]],
    'X': [[(.1, .08), (.9, .92)], [(.9, .08), (.1, .92)]],
    '-': [[(.12, .52), (.88, .47)]],
    '/': [[(.85, 0), (.15, 1)]],
}


def catmull(pts, n=8):
    if len(pts) < 3:
        out = []
        for a, b in zip(pts, pts[1:]):
            for t in np.linspace(0, 1, n, endpoint=False):
                out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
        out.append(pts[-1])
        return out
    p = [pts[0]] + list(pts) + [pts[-1]]
    out = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = map(np.array, (p[i - 1], p[i], p[i + 1], p[i + 2]))
        for t in np.linspace(0, 1, n, endpoint=False):
            out.append(tuple(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)))
    out.append(pts[-1])
    return out


class Hand:
    """One person's pencil writing. Draws onto a mask; the card composites it as graphite."""

    def __init__(self, rng, slant=.18, size=1.0, wobble=.035, pen=3.6, press=.85):
        self.rng, self.slant, self.size, self.wobble, self.pen, self.press = rng, slant, size, wobble, pen, press

    def glyph(self, draw, key, cx, cy, h, alpha=255):
        r = self.rng
        h *= self.size * r.uniform(.88, 1.1)
        w = h * r.uniform(.55, .68)
        rot = math.radians(r.uniform(-6, 6))
        sl = self.slant + r.uniform(-.06, .06)
        cx += r.uniform(-.1, .1) * w
        cy += r.uniform(-.06, .06) * h
        for stroke in GLYPHS[key]:
            pts = catmull([(x + r.gauss(0, self.wobble), y + r.gauss(0, self.wobble)) for x, y in stroke])
            mapped = []
            for x, y in pts:
                px, py = (x - .5) * w, (y - .5) * h
                px += -py * sl
                mapped.append((cx + px * math.cos(rot) - py * math.sin(rot), cy + px * math.sin(rot) + py * math.cos(rot)))
            base = self.pen * r.uniform(.85, 1.15)
            val = int(alpha * self.press * r.uniform(.85, 1.0))
            for i, (a, b) in enumerate(zip(mapped, mapped[1:])):
                wdt = max(1.2, base * (0.8 + 0.3 * math.sin(i / len(mapped) * math.pi)))
                draw.line([a, b], fill=val, width=max(1, int(round(wdt))))
                draw.ellipse([b[0] - wdt / 2, b[1] - wdt / 2, b[0] + wdt / 2, b[1] + wdt / 2], fill=val)

    def write(self, draw, text, cx, cy, h, alpha=255):
        keys = [text] if text in GLYPHS else list(text)
        step = h * .64 * self.size
        x = cx - step * (len(keys) - 1) / 2
        for k in keys:
            self.glyph(draw, k, x, cy, h, alpha)
            x += step


def write_name(mask, text, x, y, h, hand, rng):
    """Names: a typeface, slanted and warped so it reads as handwriting."""
    f = font(ITAL, int(h))
    layer = Image.new('L', (int(h * len(text) * .8 + 50), int(h * 1.8)), 0)
    ImageDraw.Draw(layer).text((15, int(h * .2)), text, font=f, fill=255)
    arr = np.array(layer, dtype=np.float32)
    hh, ww = arr.shape
    yy, xx = np.mgrid[0:hh, 0:ww].astype(np.float32)
    arr = cv2.remap(arr, xx + yy * hand.slant + 1.6 * np.sin(yy / 6 + rng.uniform(0, 6)), yy + 1.8 * np.sin(xx / 19 + rng.uniform(0, 6)), cv2.INTER_LINEAR)
    m = Image.fromarray(np.clip(arr * hand.press, 0, 255).astype(np.uint8))
    mask.paste(Image.new('L', m.size, 255), (int(x), int(y - h * .7)), m)


def pencil(card, mask, ghost, seed):
    """Composite pencil marks: grainy graphite, plus faint smudged ghosts of rubbed-out numbers."""
    rng = np.random.default_rng(seed)
    a = np.array(mask, np.float32) / 255
    grain = np.clip(rng.normal(1, .28, a.shape), .35, 1.3).astype(np.float32)
    a = cv2.GaussianBlur(a * grain, (0, 0), .6)
    g = cv2.GaussianBlur(np.array(ghost, np.float32) / 255, (0, 0), 2.2) * .28
    g += cv2.GaussianBlur(np.array(ghost, np.float32) / 255, (0, 0), 9) * .1
    arr = np.array(card, np.float32)
    col = np.array(GRAPHITE, np.float32)
    for layer in (g, a):
        layer = np.clip(layer, 0, 1)[..., None]
        arr = arr * (1 - layer) + col * layer
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


# ---------- printed cards ----------
INK = (24, 58, 40)
PAPER = (248, 246, 239)


def key_box(d, mask, hands, names, hcps, x0, y0, w, rng, labels=('Player', "H'cap"), cols=2):
    """'Player A ______ H'cap __' lines, filled in by hand."""
    lh = 64
    colw = w // cols
    for i, L in enumerate('ABCD'):
        cx = x0 + (i % cols) * colw
        cy = y0 + (i // cols) * lh
        d.text((cx, cy), f'{labels[0]} {L}', font=font(SANS_B, 26), fill=INK)
        d.line([cx + 130, cy + 34, cx + colw - 190, cy + 34], fill=INK, width=2)
        d.text((cx + colw - 175, cy), labels[1], font=font(SANS, 24), fill=INK)
        d.line([cx + colw - 95, cy + 34, cx + colw - 30, cy + 34], fill=INK, width=2)
        write_name(mask, names[i], cx + 140, cy + 6, 34, hands[i], rng)
        hands[i].write(ImageDraw.Draw(mask), str(hcps[i]), cx + colw - 62, cy + 14, 30)
    return y0 + lh * ((4 + cols - 1) // cols)


def write_cell(dm, dg, hand, v, cx, cy, h):
    """v: '5', 'X', '-', '4like9', '3messy', '4/2' (strokes/points), or 'old>new' (rubbed out and rewritten)."""
    if '>' in v:
        old, new = v.split('>')
        hand.write(dg, old, cx, cy, h)
        hand.write(dm, new, cx + 4, cy - 2, h)
    elif '/' in v and v not in GLYPHS:
        s, p = v.split('/')
        hand.write(dm, s, cx - h * .3, cy - h * .12, h)
        hand.write(dm, p, cx + h * .38, cy + h * .25, h * .5)
    else:
        hand.write(dm, v, cx, cy, h)


def card_vertical(holes, players, cells, hands, title, seed):
    """Irish/UK style: holes down the side, A B C D across the top."""
    rng = random.Random(seed)
    W, H = 1300, 1560
    img = Image.new('RGB', (W, H), PAPER)
    mask = Image.new('L', (W, H), 0)
    ghost = Image.new('L', (W, H), 0)
    d, dm, dg = ImageDraw.Draw(img), ImageDraw.Draw(mask), ImageDraw.Draw(ghost)
    d.rectangle([0, 0, W, 96], fill=INK)
    d.text((50, 26), title, font=font(SANS_B, 40), fill=PAPER)
    d.text((W - 380, 36), 'Date', font=font(SANS, 26), fill=INK if False else (210, 225, 214))
    d.line([W - 310, 66, W - 60, 66], fill=(210, 225, 214), width=2)
    y = key_box(d, mask, hands, players, [12, 20, 14, 8] if players[0] == 'Pat' else [8, 14, 12, 20], 50, 128, W - 100, rng)
    y += 24
    cols = [('HOLE', 92), ('YELLOW\nmetres', 128), ('PAR', 84), ('S.I.', 84), ("MARKER'S\nSCORE", 128), ('A', 132), ('B', 132), ('C', 132), ('D', 132), ('W L H', 96)]
    x0 = 50
    xs = [x0]
    for _, w in cols:
        xs.append(xs[-1] + w)
    hdr = 84
    rh = 112
    top = y
    d.rectangle([x0, top, xs[-1], top + hdr], fill=(226, 236, 228))
    for i, (lab, w) in enumerate(cols):
        f = font(SANS_B, 22 if '\n' in lab else 28)
        lines = lab.split('\n')
        for j, ln in enumerate(lines):
            tw = d.textlength(ln, font=f)
            d.text((xs[i] + (w - tw) / 2, top + (hdr - 26 * len(lines)) / 2 + j * 26), ln, font=f, fill=INK)
    y = top + hdr
    for r, n in enumerate(holes):
        if r % 2:
            d.rectangle([x0, y, xs[-1], y + rh], fill=(240, 243, 236))
        vals = [str(n), str(MET[n - 1]), str(PAR[n - 1]), str(SI[n - 1])]
        for i, v in enumerate(vals):
            f = font(SANS_B if i == 0 else SANS, 34 if i == 0 else 28)
            tw = d.textlength(v, font=f)
            d.text((xs[i] + (cols[i][1] - tw) / 2, y + rh / 2 - 18), v, font=f, fill=INK)
        for p in range(4):
            v = cells[p][r]
            if v:
                write_cell(dm, dg, hands[p], v, xs[5 + p] + cols[5 + p][1] / 2, y + rh / 2 + 2, 46)
        y += rh
    d.rectangle([x0, y, xs[-1], y + 80], fill=(226, 236, 228))
    out = 'OUT' if holes[0] == 1 else 'IN'
    d.text((x0 + 18, y + 24), out, font=font(SANS_B, 30), fill=INK)
    tot = sum(MET[n - 1] for n in holes)
    d.text((xs[1] + 18, y + 26), str(tot), font=font(SANS, 28), fill=INK)
    d.text((xs[2] + 26, y + 26), str(sum(PAR[n - 1] for n in holes)), font=font(SANS, 28), fill=INK)
    y += 80
    for yy in [top] + [top + hdr + i * rh for i in range(10)] + [y]:
        d.line([x0, yy, xs[-1], yy], fill=INK, width=3 if yy in (top, y, top + hdr) else 1)
    for i, x in enumerate(xs):
        d.line([x, top, x, y], fill=INK, width=3 if i in (0, 5, 9, len(xs) - 1) else 1)
    d.text((x0, y + 40), "Marker's signature", font=font(SANS, 24), fill=INK)
    d.line([x0 + 220, y + 66, x0 + 560, y + 66], fill=INK, width=2)
    d.text((x0 + 620, y + 40), "Player's signature", font=font(SANS, 24), fill=INK)
    d.line([x0 + 830, y + 66, xs[-1], y + 66], fill=INK, width=2)
    return pencil(img, mask, ghost, seed)


def card_horizontal_es(holes, players, cells, hands, seed):
    """Spanish style: holes across, Jugador A-D rows down the side."""
    rng = random.Random(seed)
    W, H = 2000, 1080
    img = Image.new('RGB', (W, H), PAPER)
    mask = Image.new('L', (W, H), 0)
    ghost = Image.new('L', (W, H), 0)
    d, dm, dg = ImageDraw.Draw(img), ImageDraw.Draw(mask), ImageDraw.Draw(ghost)
    d.rectangle([0, 0, W, 90], fill=(15, 70, 110))
    d.text((50, 22), 'TARJETA DE JUEGO  ·  SCORECARD', font=font(SANS_B, 38), fill=PAPER)
    d.text((W - 520, 30), 'Fecha / Date', font=font(SANS, 26), fill=(205, 222, 235))
    d.line([W - 350, 62, W - 60, 62], fill=(205, 222, 235), width=2)
    y = key_box(d, mask, hands, players, [12, 20, 14, 8], 50, 116, W - 100, rng, labels=('Jugador', 'Hcp'), cols=4)
    y += 26
    lab, col, tot = 250, 158, 160
    x0 = 50
    xs = [x0 + lab + i * col for i in range(10)]
    xend = xs[-1] + tot
    blue = (15, 70, 110)
    rows = [('HOYO / HOLE', 64, 'hole'), ('Amarillas (m)', 54, 'm'), ('Par', 54, 'par'), ('Hcp', 54, 'si')]
    top = y
    for label, hgt, key in rows:
        if key == 'hole':
            d.rectangle([x0, y, xend, y + hgt], fill=(222, 233, 242))
        d.text((x0 + 14, y + hgt / 2 - 15), label, font=font(SANS_B if key == 'hole' else SANS, 26), fill=blue)
        for i, n in enumerate(holes):
            v = {'hole': n, 'm': MET[n - 1], 'par': PAR[n - 1], 'si': SI[n - 1]}[key]
            f = font(SANS_B if key == 'hole' else SANS, 32 if key == 'hole' else 26)
            tw = d.textlength(str(v), font=f)
            d.text((xs[i] + (col - tw) / 2, y + hgt / 2 - 16), str(v), font=f, fill=blue)
        tv = {'hole': 'VUELTA' if holes[0] > 9 else 'IDA', 'm': sum(MET[n - 1] for n in holes), 'par': sum(PAR[n - 1] for n in holes), 'si': ''}[key]
        f = font(SANS_B if key == 'hole' else SANS, 24)
        d.text((xs[9] + (tot - d.textlength(str(tv), font=f)) / 2, y + hgt / 2 - 14), str(tv), font=f, fill=blue)
        y += hgt
        d.line([x0, y, xend, y], fill=blue, width=1)
    d.line([x0, y, xend, y], fill=blue, width=3)
    prow = 116
    for p, L in enumerate('ABCD'):
        d.text((x0 + 18, y + prow / 2 - 22), L, font=font(SANS_B, 40), fill=blue)
        for i, v in enumerate(cells[p]):
            if v:
                write_cell(dm, dg, hands[p], v, xs[i] + col / 2, y + prow / 2 + 2, 48)
        y += prow
        d.line([x0, y, xend, y], fill=blue, width=1)
    d.text((x0 + 14, y + 22), 'Marcador / Marker', font=font(SANS, 24), fill=blue)
    y += 76
    d.line([x0, y, xend, y], fill=blue, width=3)
    for i, x in enumerate([x0] + xs + [xend]):
        d.line([x, top, x, y], fill=blue, width=3 if i in (0, 1, 11) or x == xs[-1] else 1)
    d.rectangle([x0, top, xend, y], outline=blue, width=3)
    return pencil(img, mask, ghost, seed)


# ---------- photograph ----------
def photograph(card, seed, angle=7, glare=None, shadow=True, light=.25, blur=1.0, bg='seat', out_w=1600):
    rng = np.random.default_rng(seed)
    cw, ch = card.size
    BW, BH = int(max(cw, ch) * 1.35), int(max(cw, ch) * 1.35 * (0.72 if cw > ch else 1.3))
    if bg == 'seat':
        base = cv2.GaussianBlur(rng.normal(70, 6, (BH, BW, 3)).astype(np.float32), (0, 0), 3)
    else:
        base = np.ones((BH, BW, 3), np.float32) * np.array([120, 92, 64], np.float32)
        base += cv2.GaussianBlur(rng.normal(0, 18, (BH, BW)).astype(np.float32), (0, 0), 1)[..., None] * np.array([1, .8, .6], np.float32)
    src = np.float32([[0, 0], [cw, 0], [cw, ch], [0, ch]])
    sc = min(BW / cw, BH / ch) * .82
    a = math.radians(angle)
    dst = []
    for (x, y) in src:
        px, py = (x - cw / 2) * sc, (y - ch / 2) * sc
        dst.append([BW / 2 + px * math.cos(a) - py * math.sin(a) + rng.uniform(-40, 40), BH / 2 + px * math.sin(a) + py * math.cos(a) + rng.uniform(-40, 40)])
    dst = np.float32(dst)
    dst[0][0] += 30; dst[1][0] -= 30
    M = cv2.getPerspectiveTransform(src, dst)
    warped = cv2.warpPerspective(np.array(card, np.float32), M, (BW, BH))
    mask = cv2.warpPerspective(np.ones((ch, cw), np.float32), M, (BW, BH))
    sh = cv2.GaussianBlur(cv2.warpAffine(mask, np.float32([[1, 0, 22], [0, 1, 30]]), (BW, BH)), (0, 0), 25)
    out = base * (1 - .55 * sh[..., None])
    out = out * (1 - mask[..., None]) + warped * mask[..., None]
    yy, xx = np.mgrid[0:BH, 0:BW].astype(np.float32)
    grad = 1 - light * ((xx / BW) * .7 + (yy / BH) * .3)
    vign = 1 - .22 * (((xx - BW / 2) / (BW / 2)) ** 2 + ((yy - BH / 2) / (BH / 2)) ** 2)
    out *= (grad * vign)[..., None]
    if shadow:
        s = np.zeros((BH, BW), np.float32)
        cv2.ellipse(s, (int(BW * .8), int(BH * .88)), (int(BW * .22), int(BH * .15)), -25, 0, 360, 1, -1)
        out *= (1 - .38 * cv2.GaussianBlur(s, (0, 0), 60))[..., None]
    if glare:
        g = np.zeros((BH, BW), np.float32)
        gx, gy, rx, ry = glare
        cv2.ellipse(g, (int(gx * BW), int(gy * BH)), (int(rx * BW), int(ry * BH)), -15, 0, 360, 1, -1)
        out = out + (255 - out) * (.9 * cv2.GaussianBlur(g, (0, 0), 35))[..., None]
    out += rng.normal(0, 4, out.shape)
    out = np.clip(out, 0, 255).astype(np.uint8)
    if blur:
        out = cv2.GaussianBlur(out, (0, 0), blur)
    return Image.fromarray(out).resize((out_w, int(out_w * BH / BW)), Image.LANCZOS)


# ---------- the three test cards ----------
def build():
    rng = random.Random(7)
    pat = Hand(rng, slant=.2, size=1.0, wobble=.03, pen=3.6, press=.9)
    der = Hand(rng, slant=.05, size=1.1, wobble=.045, pen=4.4, press=.95)
    sea = Hand(rng, slant=.28, size=.9, wobble=.03, pen=3.2, press=.7)
    mic = Hand(rng, slant=.12, size=1.0, wobble=.05, pen=3.8, press=.8)
    H = {'Pat': pat, 'Dermot': der, 'Seán': sea, 'Mick': mic}
    app = {
        'Pat':    [4, 5, 5, 5, 5, 4, 3, 5, 4, 5, 6, 5, 3, 6, 3, 4, 5, 4],
        'Dermot': [6, 5, 6, 7, 5, 6, 4, 5, 6, 5, 6, 6, 'P', 7, 4, 5, 6, 5],
        'Seán':   [5, 6, 4, 5, 6, 5, 4, 4, 6, 5, 5, 6, 4, 5, 2, 4, 4, 5],
        'Mick':   [4, 5, 5, 4, 5, 5, 3, 5, 5, 4, 5, 6, 4, 6, 'P', 4, 5, 4],
    }
    s = lambda name, rng_: [str(v) for v in app[name][rng_]]
    cards = []

    # A: Irish/UK card, front nine, holes down, A-D across. Good photo.
    order = ['Pat', 'Dermot', 'Seán', 'Mick']
    cells = [s(n, slice(0, 9)) for n in order]
    cells[2][3] = '6'            # Seán hole 4: card 6, app 5
    cells[0][7] = '5>6'          # Pat hole 8: 5 rubbed out, 6 written over it; app 5
    cells[3][6] = '3messy'       # Mick hole 7: scrawled 3, matches
    card = card_vertical(list(range(1, 10)), order, cells, [H[n] for n in order], 'SCORECARD', 1)
    photograph(card, 11, angle=-5, light=.2, blur=.8).save(OUT / 'card-a-front-nine-vertical.jpg', quality=82)
    cards.append({'file': 'card-a-front-nine-vertical.jpg', 'layout': 'Holes down, A B C D across. Key: A Pat, B Dermot, C Seán, D Mick.',
                  'differences': [{'hole': 4, 'player': 'Seán (C)', 'card': 6, 'app': 5}, {'hole': 8, 'player': 'Pat (A)', 'card': 6, 'app': 5, 'note': '5 rubbed out, 6 written over the ghost'}],
                  'traps': [{'hole': 7, 'player': 'Mick (D)', 'note': 'Scrawled 3 that matches the app'}]})

    # B: Spanish card, back nine, holes across, Jugador A-D down. Glare and angle. Pick-ups as X and dash.
    cells = [s(n, slice(9, 18)) for n in order]
    cells[1][3] = 'X'            # Dermot 13 picked up, written X
    cells[3][5] = '-'            # Mick 15 picked up, written as a dash
    cells[3][7] = '6'            # Mick 17: card 6, app 5
    cells[0][8] = '5'            # Pat 18: card 5, app 4
    cells[2][6] = '4like9'       # Seán 16: a 4 that looks like 9; matches
    card = card_horizontal_es(list(range(10, 19)), order, cells, [H[n] for n in order], 2)
    photograph(card, 22, angle=-8, glare=(.47, .5, .1, .07), light=.35, blur=1.1, bg='table').save(OUT / 'card-b-back-nine-spanish.jpg', quality=78)
    cards.append({'file': 'card-b-back-nine-spanish.jpg', 'layout': 'Spanish card. Holes across, Jugador A-D down. Key: A Pat, B Dermot, C Seán, D Mick.',
                  'differences': [{'hole': 17, 'player': 'Mick (D)', 'card': 6, 'app': 5}, {'hole': 18, 'player': 'Pat (A)', 'card': 5, 'app': 4}],
                  'traps': [{'hole': 13, 'player': 'Dermot (B)', 'note': 'X = picked up, matches'}, {'hole': 15, 'player': 'Mick (D)', 'note': 'Dash = picked up, matches'},
                            {'hole': 16, 'player': 'Seán (C)', 'note': 'Open 4 that looks like 9; must not be read as 9'}, {'hole': 'middle', 'player': 'any', 'note': 'Glare: unreadable cells must be flagged, not guessed'}]})

    # C: Irish/UK card again, front nine, different key order, Pat writes strokes/points. Poorer photo.
    order_c = ['Mick', 'Seán', 'Pat', 'Dermot']
    cells = [s(n, slice(0, 9)) for n in order_c]
    cells[3][4] = '6'            # Dermot hole 5: card 6, app 5
    pts_pat = ['2', '1', '2', '1', '2', '3', '3', '2', '3']
    cells[2] = [f'{a}/{b}' for a, b in zip(cells[2], pts_pat)]
    names_c = ['Mick', 'Seán', 'Pat', 'Derm']
    card = card_vertical(list(range(1, 10)), names_c, cells, [H[n] for n in order_c], 'SCORECARD', 3)
    photograph(card, 33, angle=9, light=.45, blur=1.3).save(OUT / 'card-c-front-nine-reordered.jpg', quality=75)
    cards.append({'file': 'card-c-front-nine-reordered.jpg', 'layout': 'Holes down. Key in a different order: A Mick, B Seán, C Pat, D "Derm".',
                  'differences': [{'hole': 5, 'player': 'Dermot (D)', 'card': 6, 'app': 5}],
                  'traps': [{'hole': 'all', 'player': 'Pat (C)', 'note': 'Writes strokes with points small beside them (4 2); read the strokes'},
                            {'hole': 'all', 'player': 'Dermot (D)', 'note': 'Written as "Derm"; match by key name or by scores'}]})
    (OUT / 'answer-key.json').write_text(json.dumps({'app_scores_round1_group1': app, 'cards': cards}, ensure_ascii=False, indent=1))


build()
print('done', sorted(p.name for p in OUT.iterdir()))
