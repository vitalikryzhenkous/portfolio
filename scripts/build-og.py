# /// script
# requires-python = ">=3.12"
# dependencies = ["pillow==13.0.0"]
# ///
"""Link-preview images (1200x630) for every page listed in src/data/og.json.

    uv run scripts/build-og.py
"""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT_DIR = Path("/usr/share/fonts/truetype/liberation")
W, H, PAD = 1200, 630, 72
BG, FG, MUTED, ACCENT = "#111114", "#ececf0", "#a0a0ab", "#8aa8ff"


def wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=font) <= width:
            line = trial
        else:
            lines.append(line)
            line = word
    return lines + [line]


def render(slug: str, title: str, kicker: str) -> Path:
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    bold = lambda s: ImageFont.truetype(str(FONT_DIR / "LiberationSans-Bold.ttf"), s)
    regular = lambda s: ImageFont.truetype(str(FONT_DIR / "LiberationSans-Regular.ttf"), s)

    d.rectangle([0, 0, 14, H], fill=ACCENT)
    d.text((PAD, PAD), kicker.upper(), font=bold(28), fill=MUTED)
    size = 64
    while True:  # shrink the title until it fits in 4 lines
        lines = wrap(d, title, bold(size), W - 2 * PAD)
        if len(lines) <= 4 or size <= 40:
            break
        size -= 4
    y = PAD + 70
    for line in lines:
        d.text((PAD, y), line, font=bold(size), fill=FG)
        y += int(size * 1.18)
    d.text((PAD, H - PAD - 40), "Vitalii Ryzhenko", font=bold(36), fill=FG)
    d.text((PAD + 330, H - PAD - 34), "Poznań · github.com/vitalikryzhenkous", font=regular(28), fill=MUTED)

    out = ROOT / "public" / "og" / f"{slug}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, optimize=True)
    return out


if __name__ == "__main__":
    pages = json.loads((ROOT / "src/data/og.json").read_text(encoding="utf-8"))["pages"]
    for slug, p in pages.items():
        print("built", render(slug, p["title"], p["kicker"]).relative_to(ROOT))
