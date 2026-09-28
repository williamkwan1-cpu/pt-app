#!/usr/bin/env python3
"""Bundle TacticalBody into one offline HTML file (fonts embedded)."""
import base64, pathlib
ROOT = pathlib.Path(__file__).parent
F = ROOT / "fonts"

def face(family, pkg, file, weight):
    path = F / pkg / "files" / file
    b64 = base64.b64encode(path.read_bytes()).decode()
    return f'@font-face{{font-family:"{family}";src:url(data:font/woff2;base64,{b64}) format("woff2");font-weight:{weight};font-style:normal;font-display:swap}}'

fonts = "\n".join([
    face("BSS", "fontsource-big-shoulders-stencil-display-5.3.0", "big-shoulders-stencil-display-latin-800-normal.woff2", 800),
    face("BSS", "fontsource-big-shoulders-stencil-display-5.3.0", "big-shoulders-stencil-display-latin-700-normal.woff2", 700),
    face("PlexMono", "fontsource-ibm-plex-mono-5.3.0", "ibm-plex-mono-latin-500-normal.woff2", 500),
    face("PlexMono", "fontsource-ibm-plex-mono-5.3.0", "ibm-plex-mono-latin-600-normal.woff2", 600),
    face("PlexSans", "fontsource-ibm-plex-sans-5.3.0", "ibm-plex-sans-latin-400-normal.woff2", 400),
    face("PlexSans", "fontsource-ibm-plex-sans-5.3.0", "ibm-plex-sans-latin-600-normal.woff2", 600),
])
src = ROOT / "src"
css = (src / "style.css").read_text()
data = (src / "data.js").read_text()
engine = (src / "engine.js").read_text()
ui = (src / "ui.js").read_text()
globals_js = "Object.assign(window,{EX,LADDERS,FAMILY_NAMES,LEVEL_RULES,WEEKS,ROUND_REST,CYCLE,SESSION_INFO,WARMUP,COOLDOWN,MOBILITY_FLOW,SWAPS,AREA_NAMES,FOODS,HABITS,PARQ,RED_FLAGS_AE,RED_FLAGS_111,RED_FLAGS_GP});"

html = f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0F110E">
<title>TacticalBody</title>
<style>
{fonts}
{css}
</style>
</head>
<body>
<div id="app"></div>
<script>
{data}
{globals_js}
</script>
<script>
{engine}
</script>
<script>
{ui}
</script>
</body>
</html>
"""
out = ROOT / "dist" / "index.html"
out.write_text(html)
print(f"built {out} ({len(html)//1024} KB)")
