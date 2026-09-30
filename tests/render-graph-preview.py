"""Render captured Scriptable draw operations; a layout approximation, not an iOS screenshot."""
import json, os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
FONT=os.environ["TIDE_DASH_PREVIEW_FONT"]  # A Japanese font is required for this approximation.
def render(ops):
    img=Image.new("RGBA",(650,324),"#082536")
    for o in ops:
        lay=Image.new("RGBA",img.size);d=ImageDraw.Draw(lay)
        c=o["color"];h=c["hex"];rgba=tuple(int(h[i:i+2],16) for i in (1,3,5))+(round(c["alpha"]*255),)
        kind=o["kind"]
        if kind in ("stroke","fillPath"):
            pts=[(p[1],p[2]) for p in o["path"] if len(p)==3]
            if kind=="stroke":d.line(pts,fill=rgba,width=max(1,round(o["width"])),joint="curve")
            else:d.polygon(pts,fill=rgba)
        else:
            r=o["rect"];box=(r["x"],r["y"],r["x"]+r["w"],r["y"]+r["h"])
            if kind=="rect":d.rectangle(box,fill=rgba)
            elif kind=="ellipse":d.ellipse(box,fill=rgba)
            elif kind=="text":
                f=ImageFont.truetype(FONT,round(o["font"]["size"]))
                d.text((r["x"],r["y"]),o["text"],font=f,fill=rgba,anchor="lt",stroke_width=0)
        img=Image.alpha_composite(img,lay)
    return img
for path in Path("previews").glob("dev*-*.json"):
    img=render(json.loads(path.read_text()))
    # Scriptable fittingContentMode in a 325 x 149 point image frame.
    fit=img.resize((299,149),Image.Resampling.LANCZOS)
    canvas=Image.new("RGBA",(325,149),"#082536");canvas.alpha_composite(fit,(13,0))
    canvas.convert("RGB").save(path.with_suffix(".png"))
    img.convert("RGB").save(path.with_name(path.stem+"-2x.png"))
