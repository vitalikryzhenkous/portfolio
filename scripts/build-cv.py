# /// script
# requires-python = ">=3.12"
# dependencies = ["reportlab==5.1.0"]
# ///
"""Build both CV PDFs from the same data as the /cv page.

    uv run scripts/build-cv.py

Sources: src/data/cv.json (experience, education, languages), src/data/stack.json (professional skills),
src/data/profile.json (name, contacts, certifications), src/data/cv-variants.json (headline, summary, order).
Output: the Applied AI / FDE PDF in public/cv/ (on the site); the Full-Stack PDF in private/cv/ (gitignored,
sent only with targeted applications). Only email, LinkedIn and city — no phone, no address.
"""

import json
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import KeepTogether, ListFlowable, ListItem, Paragraph, SimpleDocTemplate

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data"

# Liberation Sans: metric-compatible with Helvetica/Arial, but with Polish glyphs (Poznań). The built-in
# Helvetica has no "ń". Installed with the system fonts on the server (fonts-liberation).
FONT_DIR = Path("/usr/share/fonts/truetype/liberation")
pdfmetrics.registerFont(TTFont("Sans", str(FONT_DIR / "LiberationSans-Regular.ttf")))
pdfmetrics.registerFont(TTFont("Sans-Bold", str(FONT_DIR / "LiberationSans-Bold.ttf")))
pdfmetrics.registerFontFamily("Sans", normal="Sans", bold="Sans-Bold", italic="Sans", boldItalic="Sans-Bold")

BLUE = HexColor("#24548f")
INK = HexColor("#111111")
GREY = HexColor("#5a5a5a")


def load(name: str) -> dict:
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def styles() -> dict[str, ParagraphStyle]:
    base = dict(fontName="Sans", fontSize=9.4, leading=12.2, textColor=INK, alignment=TA_LEFT)
    return {
        "name": ParagraphStyle("name", **{**base, "fontName": "Sans-Bold", "fontSize": 20, "leading": 23}),
        "headline": ParagraphStyle("headline", **{**base, "fontName": "Sans-Bold", "fontSize": 11, "leading": 13.5, "textColor": BLUE}),
        "contact": ParagraphStyle("contact", **{**base, "fontSize": 9, "textColor": GREY, "spaceBefore": 2}),
        "h2": ParagraphStyle("h2", **{**base, "keepWithNext": 1, "fontName": "Sans-Bold", "fontSize": 12, "leading": 15, "textColor": BLUE, "spaceBefore": 9, "spaceAfter": 3}),
        "job": ParagraphStyle("job", **{**base, "keepWithNext": 1, "fontName": "Sans-Bold", "fontSize": 10.2, "leading": 13, "spaceBefore": 5}),
        "period": ParagraphStyle("period", **{**base, "keepWithNext": 1, "fontSize": 8.8, "textColor": GREY, "spaceAfter": 2}),
        "h4": ParagraphStyle("h4", **{**base, "keepWithNext": 1, "fontName": "Sans-Bold", "fontSize": 9.4, "spaceBefore": 3, "spaceAfter": 1}),
        "body": ParagraphStyle("body", **base),
        "earlier": ParagraphStyle("earlier", **{**base, "spaceBefore": 5}),
        "bullet": ParagraphStyle("bullet", **base),
    }


def bullets(items: list[str], st: ParagraphStyle) -> ListFlowable:
    return ListFlowable(
        [ListItem(Paragraph(escape(t), st), leftIndent=10, value="•") for t in items],
        bulletType="bullet", start="•", leftIndent=10, bulletFontSize=8, bulletOffsetY=-1,
    )


def build(variant_id: str) -> Path:
    cv, stack, profile, variants = load("cv.json"), load("stack.json"), load("profile.json"), load("cv-variants.json")
    v = variants[variant_id]
    st = styles()
    out = ROOT / v["file"]
    out.parent.mkdir(parents=True, exist_ok=True)

    linkedin = profile["links"]["linkedin"]
    contact = (
        f'{escape(profile["location"])} · <a href="mailto:{profile["email"]}">{escape(profile["email"])}</a>'
        f' · <a href="{linkedin}">{escape(linkedin.replace("https://www.", ""))}</a>'
    )
    flow = [
        Paragraph(escape(profile["name"]), st["name"]),
        Paragraph(escape(v["headline"]), st["headline"]),
        Paragraph(contact, st["contact"]),
        Paragraph("Summary", st["h2"]),
        Paragraph(escape(v["summary"]), st["body"]),
        Paragraph("Technical Skills", st["h2"]),
    ]
    groups = {g["name"]: g["items"] for g in stack["professional"]["groups"]}
    flow.append(bullets([f"{n}: " + ", ".join(groups[n]) for n in v["skills"]], st["bullet"]))
    # bold the skill group names
    flow[-1] = ListFlowable(
        [ListItem(Paragraph(f"<b>{escape(n)}:</b> {escape(', '.join(groups[n]))}", st["bullet"]), leftIndent=10, value="•") for n in v["skills"]],
        bulletType="bullet", start="•", leftIndent=10, bulletFontSize=8, bulletOffsetY=-1,
    )

    flow.append(Paragraph("Experience", st["h2"]))
    for i, job in enumerate(cv["experience"]):
        head = [
            Paragraph(f'{escape(job["company"])} — {escape(job["role"])}', st["job"]),
            Paragraph(escape(job["period"] + (f' · {job["context"]}' if job.get("context") else "")), st["period"]),
        ]
        named = {g["name"]: g["items"] for g in job["groups"]}
        order = v["groups"] if i == 0 else [g["name"] for g in job["groups"]]
        flow.extend(head)
        for name in order:
            if name:
                flow.append(Paragraph(escape(name), st["h4"]))
            flow.append(bullets(named[name], st["bullet"]))
    flow.append(Paragraph(f'<b>Earlier</b> — {escape(cv["earlier"])}', st["earlier"]))

    by_issuer: dict[str, list[str]] = {}
    for c in profile["certifications"]:
        by_issuer.setdefault(c["issuer"], []).append(c["name"])
    certs = " · ".join(f"{issuer}: {', '.join(names)}" for issuer, names in by_issuer.items())
    for title, text in (("Education", cv["education"]), ("Certifications", certs), ("Languages", cv["languages"])):
        flow.append(KeepTogether([Paragraph(title, st["h2"]), Paragraph(escape(text), st["body"])]))

    doc = SimpleDocTemplate(
        str(out), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=15 * mm, bottomMargin=15 * mm,
        title=f'{profile["name"]} — CV', author=profile["name"], subject=v["headline"], creator="", producer="",
    )
    doc.build(flow)
    return out


if __name__ == "__main__":
    for vid in ("applied-ai", "full-stack"):
        print("built", build(vid).relative_to(ROOT))
