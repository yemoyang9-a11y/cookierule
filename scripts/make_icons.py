"""Generate Cookierule icons with PIL. Same rounded-square family as Headrule,
different hue (amber) so the two sit side by side in a toolbar without
looking identical."""
from PIL import Image, ImageDraw
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICON_DIR = os.path.join(ROOT, "extension", "icons")
STORE_DIR = os.path.join(ROOT, "store")
os.makedirs(ICON_DIR, exist_ok=True); os.makedirs(STORE_DIR, exist_ok=True)

A = (214, 120, 24, 255)      # amber
A_DARK = (150, 78, 10, 255)
WHITE = (255, 255, 255, 255)

def glyph(size, scale=8):
    S = size * scale
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    grad = Image.new("RGBA", (S, S), A)
    gd = ImageDraw.Draw(grad)
    for y in range(S):
        t = y / max(S - 1, 1)
        gd.line((0, y, S, y), fill=tuple(int(A[i] * (1 - t) + A_DARK[i] * t) for i in range(3)) + (255,))
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, S - 1, S - 1), radius=int(S * 0.22), fill=255)
    img.paste(grad, (0, 0), mask)
    d = ImageDraw.Draw(img)
    # cookie: white disc with a bite taken out (transparent-ish via bg colour) and three chips
    c = S / 2; r = S * 0.30
    d.ellipse((c - r, c - r, c + r, c + r), fill=WHITE)
    br = S * 0.13
    bx, by = c + r * 0.75, c - r * 0.75
    d.ellipse((bx - br, by - br, bx + br, by + br), fill=A)
    for (dx, dy) in ((-0.35, -0.1), (0.1, 0.25), (-0.05, -0.45)):
        cr = S * 0.045
        d.ellipse((c + dx * r - cr, c + dy * r - cr, c + dx * r + cr, c + dy * r + cr), fill=A_DARK)
    return img.resize((size, size), Image.LANCZOS)

for s in (16, 32, 48, 128):
    glyph(s).save(os.path.join(ICON_DIR, f"icon{s}.png"))
glyph(128).save(os.path.join(STORE_DIR, "store-icon-128.png"))
glyph(512).save(os.path.join(STORE_DIR, "icon-512.png"))
print("icons written")
