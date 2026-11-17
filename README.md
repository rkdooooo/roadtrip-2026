# 苏州 → 五指山 · 回家路上的沿海自驾

2026 年 12 月从苏州沿海岸线开车回五指山的行程地图。总览页是全程路线，点开每个城市可以看到当地的住处、每日安排和景点车程。

打开方式：GitHub Pages，或者在本地用任意静态服务器打开 `index.html`（直接双击也能看）。

## 文件
| 文件 | 作用 |
|---|---|
| `index.html` | 页面（Leaflet 地图 + 高德底图，无需 Key） |
| `trip-data.js` | 行程数据：站点、晚数、每日安排、景点。**改行程只改这个文件** |
| `generated.js` | 自动生成的路线和景点车程，不要手改 |
| `tools/build.js` | 重新生成 `generated.js` |
| `posters/` | 每个城市的街道海报（maptoposter 风格） |
| `tools/poster.py` | 重新画海报（说明见文件开头） |
| `vendor/leaflet/` | Leaflet 1.9.4（BSD-2），放在仓库里，国内打开不依赖外网 CDN |

## 改了行程之后
```bash
node tools/build.js
```
路线和车程来自 OpenStreetMap 路网（OSRM 公共服务），长途时间已加 15% 余量，城市里加 30%；不含过路费。坐标为 GCJ-02（高德坐标系）。

## 部署到 GitHub Pages
仓库 → Settings → Pages → Source 选 `Deploy from a branch`，Branch 选 `main` / `(root)`，保存后约 1 分钟生效。

## 城市海报
风格仿照 [maptoposter](https://github.com/originalankur/maptoposter)（MIT）：沿用它的主题 JSON、道路分级配色和线宽、上下渐隐和底部排版。原项目通过 Overpass 拉数据，但 Overpass 公共服务会拒绝自动请求，所以 `tools/poster.py` 改读 [OpenFreeMap](https://openfreemap.org) 的矢量瓦片（同样是 OpenStreetMap 数据）。配色主题是 `tools/clay_pine.json`，换成 maptoposter 自带的其他主题（`noir`、`warm_beige`、`japanese_ink` 等）也可以。

```bash
git clone https://github.com/originalankur/maptoposter && cd maptoposter && uv sync && uv pip install mapbox-vector-tile
cp ../tools/clay_pine.json themes/
.venv/bin/python ../tools/poster.py --maptoposter . --theme clay_pine
```
数据 © OpenStreetMap contributors。
