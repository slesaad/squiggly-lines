// Cuts fridge magnets out of photos taken on a plain white/grey background and
// writes them as transparent WebPs for the park-fridge post.
//
//   node scripts/extract-magnets.mjs [input-dir] [output-dir]
//
// Defaults: natl-parks-magnets/ -> public/magnets/
//
// Afterwards it lists every WebP in the output directory, with its aspect
// ratio, in src/data/magnet-images.ts. The file name is the park id.
//
// The input directory may hold a `names.json` mapping photo filenames to an
// output name, an optional clockwise rotation, and an optional `hull` flag, e.g.
//   { "IMG_1234.jpg": { "name": "zion", "rotate": 90, "hull": true } }
// `hull` replaces the mask with its convex outline. Use it for rectangular or
// round magnets whose artwork has pale, paper-coloured areas at the edge,
// which the flood fill would otherwise nibble into.
// `color: false` skips the colour correction, for images that are already
// evenly lit (e.g. product shots).
// `skip: true` leaves a photo out.
// Photos without an entry keep their own basename and orientation.
//
// How the cut works:
//   1. A smooth quadratic surface is fitted to the photo's border pixels, which
//      models the paper's uneven lighting.
//   2. Starting from the border, a flood fill swallows every pixel that looks
//      like that paper: close to the modelled colour, or a neutral grey darker
//      version of it (the magnet's cast shadow).
//   3. Whatever the fill can't reach is the magnet. A small morphological
//      opening removes leftover shadow slivers, the largest blob is kept, and
//      holes inside it are filled (or, with `hull`, its convex outline is used).
//   4. The mask is scaled back up, feathered slightly, and applied as alpha to
//      the full-resolution photo, which is then trimmed and downsized.
//   5. Colour correction: every pixel is divided by the modelled paper colour
//      at that spot, so the paper would come out white. That removes the room
//      light's colour cast and falloff; a mild saturation boost follows.

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const inDir = process.argv[2] ?? 'natl-parks-magnets';
const outDir = process.argv[3] ?? 'public/magnets';

const WORK = 1000; // long side of the image the mask is computed on
const OUT = 560; // long side of the written cutout (the trip log shows it ~280 CSS px wide)
const BORDER = 10; // px band (at WORK size) used to model the background
const NEAR = 0.07; // max relative colour distance still counted as paper
const CHROMA = 0.045; // max colour cast for a pixel to count as grey shadow
const SHADOW_MIN = 0.45; // darkest shadow, as a fraction of the paper's brightness
const OPEN_R = 3; // opening radius (WORK px) that trims shadow slivers
const PAPER_WHITE = 248; // the paper is rescaled to this, which white-balances the photo
const SATURATION = 1.15; // colour boost after white balancing

async function loadNames() {
  try {
    return JSON.parse(await fs.readFile(path.join(inDir, 'names.json'), 'utf8'));
  } catch {
    return {};
  }
}

// Least-squares fit of c0 + c1 x + c2 y + c3 x² + c4 xy + c5 y² to samples.
function fitQuadratic(samples) {
  const n = 6;
  const A = Array.from({ length: n }, () => new Float64Array(n));
  const b = new Float64Array(n);
  for (const [x, y, v] of samples) {
    const t = [1, x, y, x * x, x * y, y * y];
    for (let i = 0; i < n; i++) {
      b[i] += t[i] * v;
      for (let j = 0; j < n; j++) A[i][j] += t[i] * t[j];
    }
  }
  // Gaussian elimination with partial pivoting.
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]];
    [b[i], b[p]] = [b[p], b[i]];
    for (let r = i + 1; r < n; r++) {
      const f = A[r][i] / A[i][i];
      for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
      b[r] -= f * b[i];
    }
  }
  const c = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let j = i + 1; j < n; j++) s -= A[i][j] * c[j];
    c[i] = s / A[i][i];
  }
  return (x, y) => c[0] + c[1] * x + c[2] * y + c[3] * x * x + c[4] * x * y + c[5] * y * y;
}

// Binary erosion/dilation with a square structuring element, done separably.
function morph(mask, w, h, r, dilate) {
  const pass = (src, horizontal) => {
    const dst = new Uint8Array(src.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let hit = !dilate;
        for (let k = -r; k <= r; k++) {
          const xx = horizontal ? x + k : x;
          const yy = horizontal ? y : y + k;
          const v = xx >= 0 && yy >= 0 && xx < w && yy < h ? src[yy * w + xx] : 0;
          if (dilate ? v : !v) {
            hit = dilate;
            break;
          }
        }
        dst[y * w + x] = hit ? 1 : 0;
      }
    }
    return dst;
  };
  return pass(pass(mask, true), false);
}

// Keeps the largest 4-connected foreground blob and fills its holes.
function largestSolidBlob(mask, w, h) {
  const label = new Int32Array(w * h);
  let best = 0;
  let bestSize = 0;
  let next = 1;
  const stack = [];
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || label[i]) continue;
    let size = 0;
    label[i] = next;
    stack.push(i);
    while (stack.length) {
      const j = stack.pop();
      size++;
      const x = j % w;
      const y = (j - x) / w;
      for (const k of [x > 0 && j - 1, x < w - 1 && j + 1, y > 0 && j - w, y < h - 1 && j + w]) {
        if (k !== false && mask[k] && !label[k]) {
          label[k] = next;
          stack.push(k);
        }
      }
    }
    if (size > bestSize) {
      bestSize = size;
      best = next;
    }
    next++;
  }
  // Fill holes: anything not reachable from the border without crossing the blob.
  const outside = floodFromBorder(w, h, (j) => label[j] !== best);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = outside[i] ? 0 : 1;
  return out;
}

// Marks every pixel reachable from the image border through pixels that `open` accepts.
function floodFromBorder(w, h, open) {
  const reach = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const j = stack.pop();
    if (reach[j] || !open(j)) continue;
    reach[j] = 1;
    const x = j % w;
    const y = (j - x) / w;
    if (x > 0) stack.push(j - 1);
    if (x < w - 1) stack.push(j + 1);
    if (y > 0) stack.push(j - w);
    if (y < h - 1) stack.push(j + w);
  }
  return reach;
}

// Replaces a mask with its filled convex hull (Andrew's monotone chain over
// each row's leftmost and rightmost pixels).
function convexHull(mask, w, h) {
  const pts = [];
  for (let y = 0; y < h; y++) {
    let l = -1, r = -1;
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      if (l < 0) l = x;
      r = x;
    }
    if (l >= 0) pts.push([l, y], [r + 1, y], [l, y + 1], [r + 1, y + 1]);
  }
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list) => {
    const out = [];
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  const hull = [...half(pts), ...half([...pts].reverse())];
  // Scanline fill: a pixel centre is inside if it is left of every edge.
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const cy = y + 0.5;
    let lo = -Infinity, hi = Infinity;
    for (let i = 0; i < hull.length; i++) {
      const [x0, y0] = hull[i];
      const [x1, y1] = hull[(i + 1) % hull.length];
      if (y0 === y1) {
        if ((x1 - x0) * (cy - y0) < 0) { lo = Infinity; break; }
        continue;
      }
      const xi = x0 + ((cy - y0) * (x1 - x0)) / (y1 - y0);
      if (y1 > y0) hi = Math.min(hi, xi); // edge heading down bounds the right side
      else lo = Math.max(lo, xi);
    }
    for (let x = Math.max(0, Math.ceil(lo - 0.5)); x < Math.min(w, hi - 0.5); x++) out[y * w + x] = 1;
  }
  return out;
}

async function extract(file, { name, rotate = 0, hull = false, color = true }) {
  // Bake EXIF orientation, then the requested rotation, into raw pixels. These
  // are separate passes because sharp honours only one rotate() per pipeline.
  const oriented = await sharp(path.join(inDir, file)).rotate().toBuffer();
  const { data: rgb, info } = await sharp(oriented).rotate(rotate).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const upright = () => sharp(rgb, { raw: { width: W, height: H, channels: 3 } });
  const s = WORK / Math.max(W, H);
  const w = Math.round(W * s);
  const h = Math.round(H * s);
  const px = await upright().resize(w, h).raw().toBuffer();

  // 1. Model the paper from the border band.
  const samples = [[], [], []];
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      if (x >= BORDER && y >= BORDER && x < w - BORDER && y < h - BORDER) continue;
      const i = (y * w + x) * 3;
      for (let c = 0; c < 3; c++) samples[c].push([x / w, y / h, px[i + c]]);
    }
  }
  const model = samples.map(fitQuadratic);

  // 2. Classify paper-like pixels, then flood from the border through them.
  const paper = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const bg = model.map((m) => Math.max(1, m(x / w, y / h)));
      const ratio = [0, 1, 2].map((c) => px[i * 3 + c] / bg[c]);
      const lum = (ratio[0] + ratio[1] + ratio[2]) / 3;
      const cast = Math.max(...ratio.map((r) => Math.abs(r - lum)));
      const near = Math.max(...ratio.map((r) => Math.abs(r - 1))) < NEAR;
      const shadow = cast < CHROMA && lum > SHADOW_MIN && lum < 1 + NEAR;
      paper[i] = near || shadow ? 1 : 0;
    }
  }
  const bgReach = floodFromBorder(w, h, (j) => paper[j]);

  // 3. Clean up the magnet mask.
  let mask = bgReach.map((v) => 1 - v);
  mask = morph(morph(mask, w, h, OPEN_R, false), w, h, OPEN_R, true);
  mask = largestSolidBlob(mask, w, h);
  if (hull) mask = convexHull(mask, w, h);

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error('no magnet found');

  // 4. Full-resolution alpha: upscale, feather, crop, downsize.
  const alpha = await sharp(Buffer.from(mask.map((v) => v * 255)), { raw: { width: w, height: h, channels: 1 } })
    .resize(W, H, { kernel: 'cubic' })
    .blur(1.2)
    .extractChannel(0)
    .raw()
    .toBuffer();
  const pad = Math.round(2 / s);
  const left = Math.max(0, Math.floor(minX / s) - pad);
  const top = Math.max(0, Math.floor(minY / s) - pad);
  const width = Math.min(W - left, Math.ceil((maxX - minX + 1) / s) + pad * 2);
  const height = Math.min(H - top, Math.ceil((maxY - minY + 1) / s) + pad * 2);

  const rgba = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    const gain = [0, 1, 2].map((c) => (x) => (color ? PAPER_WHITE / Math.max(1, model[c](x / W, y / H)) : 1));
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      for (let c = 0; c < 3; c++) rgba[i * 4 + c] = Math.min(255, Math.round(rgb[i * 3 + c] * gain[c](x)));
      rgba[i * 4 + 3] = alpha[i];
    }
  }
  const cut = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left, top, width, height })
    .png()
    .toBuffer();
  const outFile = path.join(outDir, `${name}.webp`);
  await sharp(cut)
    .resize(OUT, OUT, { fit: 'inside', withoutEnlargement: true })
    .modulate({ saturation: color ? SATURATION : 1 })
    .webp({ quality: 82, alphaQuality: 100 })
    .toFile(outFile);
  const meta = await sharp(outFile).metadata();
  return `${outFile} (${meta.width}x${meta.height})`;
}

// Writes src/data/magnet-images.ts from the WebPs currently in outDir.
async function writeManifest() {
  const files = (await fs.readdir(outDir)).filter((f) => f.endsWith('.webp')).sort();
  const rows = [];
  for (const f of files) {
    const { width, height } = await sharp(path.join(outDir, f)).metadata();
    const src = path.posix.join(path.relative('public', outDir).split(path.sep).join('/'), f);
    rows.push(`  '${path.parse(f).name}': { src: '${src}', aspect: ${(width / height).toFixed(3)} },`);
  }
  const body = [
    '// Generated by scripts/extract-magnets.mjs. Do not edit by hand.',
    '// Cut-out magnet photos keyed by park id; aspect is width / height.',
    '',
    'export const magnetImages: Record<string, { src: string; aspect: number }> = {',
    ...rows,
    '};',
    '',
  ].join('\n');
  await fs.writeFile('src/data/magnet-images.ts', body);
  console.log(`src/data/magnet-images.ts (${files.length} images)`);
}

const names = await loadNames();
await fs.mkdir(outDir, { recursive: true });
const files = (await fs.readdir(inDir)).filter((f) => /\.(jpe?g|png|heic|webp|avif)$/i.test(f)).sort();
for (const file of files) {
  const entry = names[file] ?? { name: path.parse(file).name };
  if (entry.skip) continue;
  try {
    console.log(`${file} -> ${await extract(file, entry)}`);
  } catch (err) {
    console.error(`${file}: ${err.message}`);
    process.exitCode = 1;
  }
}
await writeManifest();
