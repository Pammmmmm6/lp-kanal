#!/usr/bin/env python3
"""Recadre et convertit les captures de render_assets.mjs en JPEG pour les emails
(1104 px de large = 552 px affichés en 2x ; les clients mail lisent mal le WebP)."""
import os
from PIL import Image

HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets')
# capture → (fichier final, recadrage horizontal en fractions de la largeur)
JOBS = {
    'mcp-hero.png': ('mcp-hero.jpg', (0.12, 0.88)),   # serré sur la fenêtre de l'assistant
    'update-rcs.png': ('update-rcs.jpg', (0, 1)),
    'update-sms.png': ('update-sms.jpg', (0, 1)),
    'update-instagram.png': ('update-instagram.jpg', (0, 1)),
    'update-klaviyo.png': ('update-klaviyo.jpg', (0, 1)),
}

for src, (dst, (x0, x1)) in JOBS.items():
    path = os.path.join(HERE, src)
    if not os.path.exists(path):
        continue
    im = Image.open(path).convert('RGB')
    im = im.crop((round(im.width * x0), 0, round(im.width * x1), im.height))
    w = min(1104, im.width)
    im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(os.path.join(HERE, dst), 'JPEG', quality=86, optimize=True, progressive=True)
    os.remove(path)
    print(dst, im.size)

# logo : encre noire et blanche sur fond transparent, à partir de la capture
logo = os.path.join(HERE, 'logo.png')
im = Image.open(logo).convert('RGBA')
if im.getpixel((0, 0))[3] == 255:  # capture brute (fond opaque) → on extrait l'encre
    dark, light = Image.new('RGBA', im.size), Image.new('RGBA', im.size)
    for x in range(im.width):
        for y in range(im.height):
            r, g, b, a = im.getpixel((x, y))
            ink = round((255 - (r * 299 + g * 587 + b * 114) / 1000) * a / 255)
            dark.putpixel((x, y), (10, 10, 10, ink))
            light.putpixel((x, y), (244, 244, 242, ink))
    dark.save(logo)
    light.save(os.path.join(HERE, 'logo-white.png'))
    print('logo.png, logo-white.png', im.size)
