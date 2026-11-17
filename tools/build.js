// 预先算好路线和车程，生成 generated.js；网页打开后不再请求任何接口。
// 用法：node tools/build.js（改了 trip-data.js 里的站点或景点后重新运行）
// 数据来源：OSRM 公共路网（OpenStreetMap），免费；长途时间 ×1.15，城市里 ×1.3。
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = path.join(__dirname, '..');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(dir, 'trip-data.js'), 'utf8'), ctx);
const T = ctx.window.TRIP;
const LONG_PACE = 1.15, CITY_PACE = 1.3, OSRM = 'https://router.project-osrm.org';

// ---- GCJ-02 <-> WGS-84 ----
const PI = Math.PI, A = 6378245.0, EE = 0.00669342162296594323;
function tLat(x, y) { let r = -100 + 2 * x + 3 * y + .2 * y * y + .1 * x * y + .2 * Math.sqrt(Math.abs(x)); r += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3; r += (20 * Math.sin(y * PI) + 40 * Math.sin(y / 3 * PI)) * 2 / 3; r += (160 * Math.sin(y / 12 * PI) + 320 * Math.sin(y * PI / 30)) * 2 / 3; return r; }
function tLng(x, y) { let r = 300 + x + 2 * y + .1 * x * x + .1 * x * y + .1 * Math.sqrt(Math.abs(x)); r += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3; r += (20 * Math.sin(x * PI) + 40 * Math.sin(x / 3 * PI)) * 2 / 3; r += (150 * Math.sin(x / 12 * PI) + 300 * Math.sin(x / 30 * PI)) * 2 / 3; return r; }
function delta(lng, lat) { let dLat = tLat(lng - 105, lat - 35), dLng = tLng(lng - 105, lat - 35); const rad = lat / 180 * PI; let m = Math.sin(rad); m = 1 - EE * m * m; const s = Math.sqrt(m); dLat = dLat * 180 / ((A * (1 - EE)) / (m * s) * PI); dLng = dLng * 180 / (A / s * Math.cos(rad) * PI); return [dLng, dLat]; }
const wgs2gcj = ([lng, lat]) => { const [a, b] = delta(lng, lat); return [lng + a, lat + b]; };
const gcj2wgs = ([lng, lat]) => { const [a, b] = delta(lng, lat); return [lng - a, lat - b]; };
const r5 = n => Math.round(n * 1e5) / 1e5;

// 道格拉斯-普克抽稀，控制文件大小（约 50 m 精度）
function simplify(pts, eps = 0.0005) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let max = 0, idx = -1;
    const [x1, y1] = pts[a], [x2, y2] = pts[b], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-12;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / L; if (d > max) { max = d; idx = i; } }
    if (max > eps) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url) { for (let i = 0; i < 3; i++) { try { const j = await (await fetch(url)).json(); if (j.code === 'Ok') return j; } catch (e) {} await sleep(1500); } throw new Error('OSRM 失败：' + url); }

(async () => {
  const legs = {}, dist = {};
  for (let i = 1; i < T.stops.length; i++) {
    const a = T.stops[i - 1], b = T.stops[i];
    if (b.type === 'hotel' && a.type === 'ferry') { // 过海：画直线，不走路网
      legs[b.id] = { km: b.drive.km, h: b.drive.h, ferry: true, path: [a.lnglat, b.lnglat] };
      continue;
    }
    const p = [a.lnglat, b.lnglat].map(gcj2wgs).map(q => q.map(r5).join(',')).join(';');
    const j = await get(`${OSRM}/route/v1/driving/${p}?overview=full&geometries=geojson`);
    const r = j.routes[0];
    const path = simplify(r.geometry.coordinates.map(wgs2gcj)).map(q => q.map(r5));
    legs[b.id] = { km: Math.round(r.distance / 1000), h: Math.round(r.duration * LONG_PACE / 360) / 10, path };
    console.log(`→ ${b.city.padEnd(8, '　')} ${String(legs[b.id].km).padStart(4)} km  ${legs[b.id].h} h  (${path.length} 点)`);
    await sleep(400);
  }
  for (const s of T.stops) {
    if (!s.spots || !s.spots.length) continue;
    const pts = [s.lnglat, ...s.spots.map(p => p.lnglat)].map(gcj2wgs).map(q => q.map(r5).join(','));
    const j = await get(`${OSRM}/table/v1/driving/${pts.join(';')}?sources=0&annotations=duration,distance`);
    dist[s.id] = s.spots.map((p, i) => p.d ? { km: p.d.km, min: p.d.min, est: true }
      : { km: Math.round(j.distances[0][i + 1] / 100) / 10, min: Math.max(5, Math.round(j.durations[0][i + 1] * CITY_PACE / 300) * 5) });
    await sleep(400);
  }
  const out = `// 自动生成，勿手改：node tools/build.js（${new Date().toISOString().slice(0, 10)}，OSRM 路网）\nwindow.GEN=${JSON.stringify({ legs, dist })};\n`;
  fs.writeFileSync(path.join(dir, 'generated.js'), out);
  console.log(`\n写入 generated.js（${(out.length / 1024).toFixed(0)} KB）`);
})().catch(e => { console.error(e.message); process.exit(1); });
