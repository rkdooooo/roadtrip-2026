"""
城市海报：maptoposter（github.com/originalankur/maptoposter，MIT）的风格，数据换成 OpenFreeMap 矢量瓦片。
原项目用 Overpass 拉 OSM 数据，但 Overpass 公共服务拒绝自动请求，所以这里改读 OpenFreeMap 的
OpenMapTiles 瓦片（同样是 OSM 数据）。主题 JSON、道路分级的颜色和线宽、上下渐隐、底部文字版式都沿用原项目。

用法（在 maptoposter 的虚拟环境里运行，需要额外装 mapbox-vector-tile）：
  python tools/poster.py --maptoposter <maptoposter 目录> --theme clay_pine [--only xiamen] [--out posters]
"""
import argparse, io, json, math, os, sys, urllib.request
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from matplotlib.collections import LineCollection
from matplotlib.path import Path
from matplotlib.patches import PathPatch
from matplotlib.collections import PatchCollection
from matplotlib.font_manager import FontProperties
import mapbox_vector_tile
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
UA = "roadtrip-poster/1.0"
# 海报中心点（WGS-84，城市核心区）与副标题
CITIES = {
    "ningbo":    ("宁波", "NINGBO",    121.550, 29.873),
    "wenzhou":   ("温州", "WENZHOU",   120.672, 28.006),
    "fuzhou":    ("福州", "FUZHOU",    119.297, 26.078),
    "xiamen":    ("厦门", "XIAMEN",    118.105, 24.475),
    "tulou":     ("永定", "YONGDING TULOU", 116.974, 24.664),
    "shantou":   ("汕头", "SHANTOU",   116.690, 23.358),
    "shenzhen":  ("深圳", "SHENZHEN",  114.060, 22.540),
    "kaiping":   ("开平", "KAIPING",   112.585, 22.345),
    "zhanjiang": ("湛江", "ZHANJIANG", 110.375, 21.230),
}
Z = 13
W_IN, H_IN, DPI = 3.6, 4.8, 220
RADIUS_M = 6500


def tile_url():
    with urllib.request.urlopen(urllib.request.Request("https://tiles.openfreemap.org/planet", headers={"User-Agent": UA}), timeout=30) as r:
        return json.load(r)["tiles"][0]


def lonlat_to_tile(lon, lat, z):
    n = 2 ** z
    x = (lon + 180) / 360 * n
    y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
    return x, y


def tile_px_to_lonlat(tx, ty, px, py, extent, z):
    n = 2 ** z
    x = (tx + px / extent) / n
    y = (ty + (1 - py / extent)) / n          # MVT y 轴向上
    lon = x * 360 - 180
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y))))
    return lon, lat


def fetch_tile(url_t, z, x, y, cache):
    p = os.path.join(cache, f"{z}_{x}_{y}.pbf")
    if not os.path.exists(p):
        req = urllib.request.Request(url_t.format(z=z, x=x, y=y), headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
        with open(p, "wb") as f:
            f.write(data)
    with open(p, "rb") as f:
        return mapbox_vector_tile.decode(f.read(), default_options={"y_coord_down": True})


ROAD_RANK = {  # OpenMapTiles transportation.class → maptoposter 的道路级别
    "motorway": "road_motorway", "trunk": "road_primary", "primary": "road_primary",
    "secondary": "road_secondary", "tertiary": "road_tertiary",
    "minor": "road_residential", "service": "road_default",
}
WIDTH = {"road_motorway": 1.2, "road_primary": 1.0, "road_secondary": 0.8, "road_tertiary": 0.6, "road_residential": 0.4, "road_default": 0.4}
ORDER = ["road_default", "road_residential", "road_tertiary", "road_secondary", "road_primary", "road_motorway"]


def gradient(ax, color, where):
    vals = np.linspace(0, 1, 256).reshape(-1, 1)
    rgb = mcolors.to_rgb(color)
    c = np.zeros((256, 4)); c[:, :3] = rgb
    c[:, 3] = np.linspace(1, 0, 256) if where == "bottom" else np.linspace(0, 1, 256)
    (x0, x1), (y0, y1) = ax.get_xlim(), ax.get_ylim()
    a, b = (0, .25) if where == "bottom" else (.75, 1)
    ax.imshow(np.hstack((vals, vals)), extent=[x0, x1, y0 + (y1 - y0) * a, y0 + (y1 - y0) * b],
              aspect="auto", cmap=mcolors.ListedColormap(c), zorder=10, origin="lower")


def render(cid, theme, fonts, url_t, cache, out, stop_no):
    cn, en, lon0, lat0 = CITIES[cid]
    k = math.cos(math.radians(lat0)) * 111320
    to_m = lambda lo, la: ((lo - lon0) * k, (la - lat0) * 110540)
    half_w = RADIUS_M
    half_h = RADIUS_M * H_IN / W_IN
    dlon, dlat = half_w / k * 1.05, half_h / 110540 * 1.05
    x0, y1 = lonlat_to_tile(lon0 - dlon, lat0 - dlat, Z)
    x1, y0 = lonlat_to_tile(lon0 + dlon, lat0 + dlat, Z)
    water, parks, roads = [], [], {r: [] for r in ORDER}

    def rings(geom):
        t = geom["type"]; cs = geom["coordinates"]
        if t == "Polygon": return [cs]
        if t == "MultiPolygon": return cs
        return []

    def lines(geom):
        t = geom["type"]; cs = geom["coordinates"]
        if t == "LineString": return [cs]
        if t == "MultiLineString": return cs
        return []

    for tx in range(int(x0), int(x1) + 1):
        for ty in range(int(y0), int(y1) + 1):
            layers = fetch_tile(url_t, Z, tx, ty, cache)
            conv = lambda pts, ext: [to_m(*tile_px_to_lonlat(tx, ty, px, ext - py, ext, Z)) for px, py in pts]
            # 和原项目一致：水面 + 公园（leisure=park）+ 草地；不画自然保护区，它们常常覆盖在海面上
            for name, target, keep in (("water", water, None), ("park", parks, {"park"}), ("landcover", parks, {"grass"})):
                L = layers.get(name)
                if not L: continue
                ext = L["extent"]
                for f in L["features"]:
                    if keep and f["properties"].get("class") not in keep: continue
                    for poly in rings(f["geometry"]):
                        target.append([conv(ring, ext) for ring in poly])   # 外环 + 洞，一起保留
            L = layers.get("transportation")
            if L:
                ext = L["extent"]
                for f in L["features"]:
                    rank = ROAD_RANK.get(f["properties"].get("class"))
                    if not rank: continue
                    for ln in lines(f["geometry"]):
                        roads[rank].append(conv(ln, ext))

    fig, ax = plt.subplots(figsize=(W_IN, H_IN), facecolor=theme["bg"])
    ax.set_facecolor(theme["bg"]); ax.set_position((0, 0, 1, 1)); ax.axis("off")
    def compound(poly):  # 一个多边形的外环和洞拼成一条路径：洞（岛屿）不填色；多边形之间各画各的，不会互相抵消
        verts, codes = [], []
        for ring in poly:
            if len(ring) < 3: continue
            verts += ring + [ring[0]]; codes += [Path.MOVETO] + [Path.LINETO] * (len(ring) - 1) + [Path.CLOSEPOLY]
        return Path(verts, codes) if verts else None
    for polys, col, zo in ((water, theme["water"], .5), (parks, theme["parks"], .8)):
        paths = [q for q in map(compound, polys) if q is not None]
        if paths: ax.add_collection(PatchCollection([PathPatch(q) for q in paths], facecolors=col, edgecolors="none", zorder=zo, match_original=False))
    scale = min(W_IN, H_IN) / 12.0
    for i, r in enumerate(ORDER):
        if roads[r]:
            ax.add_collection(LineCollection(roads[r], colors=theme[r], linewidths=WIDTH[r] * scale * 1.6, zorder=2 + i, capstyle="round"))
    ax.set_xlim(-half_w, half_w); ax.set_ylim(-half_h, half_h)
    gradient(ax, theme["gradient_color"], "bottom"); gradient(ax, theme["gradient_color"], "top")
    f = lambda w, s: FontProperties(fname=fonts[w], size=s * scale)
    ax.text(.5, .14, "  ".join(cn), transform=ax.transAxes, color=theme["text"], ha="center", fontproperties=f("bold", 60), zorder=11)
    ax.plot([.4, .6], [.125, .125], transform=ax.transAxes, color=theme["text"], linewidth=1 * scale, zorder=11)
    ax.text(.5, .10, f"{'  '.join(en)}  ·  第 {stop_no} 站", transform=ax.transAxes, color=theme["text"], ha="center", fontproperties=f("light", 18), zorder=11)
    ax.text(.5, .07, f"{lat0:.4f}° N / {lon0:.4f}° E", transform=ax.transAxes, color=theme["text"], alpha=.7, ha="center", fontproperties=f("regular", 14), zorder=11)
    ax.text(.98, .02, "© OpenStreetMap contributors · OpenFreeMap", transform=ax.transAxes, color=theme["text"], alpha=.5, ha="right", va="bottom", fontproperties=FontProperties(fname=fonts["light"], size=5), zorder=11)
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=DPI, facecolor=theme["bg"]); plt.close(fig)
    os.makedirs(out, exist_ok=True)
    dst = os.path.join(out, f"{cid}.webp")
    Image.open(buf).convert("RGB").save(dst, "WEBP", quality=82, method=6)
    return dst


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--maptoposter", required=True)
    ap.add_argument("--theme", default="clay_pine")
    ap.add_argument("--only")
    ap.add_argument("--out", default=os.path.join(HERE, "..", "posters"))
    ap.add_argument("--font", default="Noto Serif SC")
    a = ap.parse_args()
    sys.path.insert(0, a.maptoposter)
    from font_management import load_fonts
    fonts = load_fonts(a.font)
    with open(os.path.join(a.maptoposter, "themes", f"{a.theme}.json"), encoding="utf-8") as fh:
        theme = json.load(fh)
    cache = os.path.join(a.maptoposter, "cache", "omt"); os.makedirs(cache, exist_ok=True)
    url_t = tile_url()
    order = list(CITIES)
    for cid in ([a.only] if a.only else order):
        print("→", render(cid, theme, fonts, url_t, cache, a.out, order.index(cid) + 1))


if __name__ == "__main__":
    main()
