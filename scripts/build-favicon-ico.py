# /// script
# requires-python = ">=3.12"
# dependencies = ["pillow==13.0.0"]
# ///
"""root-site/favicon.ico (16/32/48) — same mark as favicon.svg, drawn with Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
img = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.rounded_rectangle([0, 0, 255, 255], radius=56, fill="#2f5bd3")
font = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", 112)
d.text((128, 132), "VR", font=font, fill="#ffffff", anchor="mm")
img.save(ROOT / "root-site" / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("built root-site/favicon.ico")
