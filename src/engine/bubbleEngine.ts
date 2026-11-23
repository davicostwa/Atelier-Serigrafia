import { ASPECT_DIMENSIONS, CompositionMode, MotionPreset, StudioParams } from '../types/studio';

export interface BubbleSeed {
  id: number;
  x: number;
  y: number;
  radius: number;
  aspect: number; // 1.0 to 1.38 subtle organic elongation when roundness < 1
  angle: number;
  phaseOffset: number;
  orbitAngle: number;
  orbitRadius: number;
  freqMult: 1 | 2;
}

export interface EvaluatedBubble {
  id: number;
  x: number;
  y: number;
  radius: number;
  aspect: number;
  angle: number;
  cosA: number;
  sinA: number;
}

export interface GeometryFrame {
  width: number;
  height: number;
  bubbles: EvaluatedBubble[];
  outerPaths: string[];
  echoPaths: string[];
  seamPaths: string[];
  individualPaths: string[];
}

// Deterministic fast PRNG (Mulberry32)
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateBubbleSeeds(
  seed: number,
  width: number,
  height: number,
  density: number,
  baseScale: number,
  sizeVariation: number,
  mode: CompositionMode
): BubbleSeed[] {
  const rng = mulberry32(seed);
  const minDim = Math.min(width, height);
  const count = Math.max(3, Math.round(density));
  const seeds: BubbleSeed[] = [];

  // Base radius scales inversely with sqrt(density) so canvas coverage stays balanced
  const nominalRadius = (minDim / Math.sqrt(count)) * 0.34 * baseScale;

  if (mode === 'grid') {
    const cols = Math.max(2, Math.round(Math.sqrt(count * (width / height))));
    const rows = Math.max(2, Math.ceil(count / cols));
    const cellW = width / cols;
    const cellH = height / rows;
    let idx = 0;
    for (let r = 0; r < rows && idx < count; r++) {
      for (let c = 0; c < cols && idx < count; c++) {
        const jitterX = (rng() - 0.5) * cellW * 0.42;
        const jitterY = (rng() - 0.5) * cellH * 0.42;
        const x = (c + 0.5) * cellW + jitterX;
        const y = (r + 0.5) * cellH + jitterY;

        const v = rng();
        const scaleFactor = 1 + (v - 0.45) * 1.15 * sizeVariation;
        const radius = Math.max(14, nominalRadius * Math.max(0.32, scaleFactor));

        seeds.push({
          id: idx,
          x,
          y,
          radius,
          aspect: 1 + rng() * 0.28,
          angle: ((c + r) % 2 === 0 ? 1 : -1) * (Math.PI * 0.25) + (rng() - 0.5) * 0.4,
          phaseOffset: ((c * 0.55 + r * 0.85) % (Math.PI * 2)),
          orbitAngle: rng() * Math.PI * 2,
          orbitRadius: minDim * (0.018 + rng() * 0.025),
          freqMult: 1,
        });
        idx++;
      }
    }
    return seeds;
  }

  if (mode === 'constellation') {
    const anchors = Math.min(3, Math.max(2, Math.floor(count / 5)));
    const anchorCenters: Array<{ x: number; y: number }> = [];
    for (let a = 0; a < anchors; a++) {
      const ax = width * (0.24 + 0.52 * rng());
      const ay = height * (0.24 + 0.52 * rng());
      anchorCenters.push({ x: ax, y: ay });
    }

    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      let scaleFactor: number;

      if (i < anchors) {
        x = anchorCenters[i].x;
        y = anchorCenters[i].y;
        scaleFactor = 1.45 + 0.55 * sizeVariation;
      } else {
        const anchor = anchorCenters[i % anchors];
        const theta = rng() * Math.PI * 2;
        const dist = minDim * (0.08 + rng() * 0.34);
        x = anchor.x + Math.cos(theta) * dist;
        y = anchor.y + Math.sin(theta) * dist;
        // Keep within generous margin around frame
        x = Math.max(width * 0.04, Math.min(width * 0.96, x));
        y = Math.max(height * 0.04, Math.min(height * 0.96, y));
        const pow = Math.pow(rng(), 1.35);
        scaleFactor = (1 - sizeVariation * 0.55) + pow * sizeVariation * 1.2;
      }

      seeds.push({
        id: i,
        x,
        y,
        radius: Math.max(12, nominalRadius * Math.max(0.28, scaleFactor)),
        aspect: 1 + rng() * 0.25,
        angle: rng() * Math.PI,
        phaseOffset: rng() * Math.PI * 2,
        orbitAngle: rng() * Math.PI * 2,
        orbitRadius: minDim * (0.02 + rng() * 0.032),
        freqMult: i % 4 === 0 ? 2 : 1,
      });
    }
    return seeds;
  }

  // 'organic' stratified distribution with intentional overlapping pairs
  const cols = Math.max(2, Math.round(Math.sqrt(count * (width / height))));
  const rows = Math.max(2, Math.ceil(count / cols));
  const cellW = (width * 0.9) / cols;
  const cellH = (height * 0.9) / rows;

  // Shuffle grid indices so size hierarchy is evenly scattered
  const indices = Array.from({ length: cols * rows }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  for (let i = 0; i < count; i++) {
    const cellIdx = indices[i % indices.length];
    const r = Math.floor(cellIdx / cols);
    const c = cellIdx % cols;

    // Pull pairs slightly closer to encourage ink-bleed intersections
    const x = width * 0.05 + (c + 0.5 + (rng() - 0.5) * 0.85) * cellW;
    const y = height * 0.05 + (r + 0.5 + (rng() - 0.5) * 0.85) * cellH;

    // Power-law-like size distribution modulated by sizeVariation
    const t = i / Math.max(1, count - 1);
    const hierarchy = 0.45 + Math.pow(1 - t, 1.45) * 1.15; // 1.6 down to 0.45
    const jitterScale = 0.85 + rng() * 0.3;
    const scaleFactor = 1 + (hierarchy * jitterScale - 1) * sizeVariation;

    seeds.push({
      id: i,
      x,
      y,
      radius: Math.max(12, nominalRadius * Math.max(0.28, scaleFactor)),
      aspect: 1 + rng() * 0.24,
      angle: rng() * Math.PI,
      phaseOffset: rng() * Math.PI * 2,
      orbitAngle: rng() * Math.PI * 2,
      orbitRadius: minDim * (0.022 + rng() * 0.032),
      freqMult: 1,
    });
  }

  return seeds;
}

export function evaluateBubbles(
  seeds: BubbleSeed[],
  phase: number,
  motionPreset: MotionPreset,
  amplitude: number,
  width: number,
  height: number,
  roundness: number,
  customOffsets: Record<number, { dx: number; dy: number }>
): EvaluatedBubble[] {
  const omega = Math.PI * 2 * phase;
  const amp = motionPreset === 'static' ? 0 : amplitude;
  // Aspect elongation softens toward circular 1.0 as roundness approaches 1.0
  const aspectMix = 1 - roundness * 0.62;

  return seeds.map((s) => {
    const off = customOffsets[s.id];
    let x = s.x + (off ? off.dx : 0);
    let y = s.y + (off ? off.dy : 0);
    let radius = s.radius;
    let angle = s.angle;

    if (amp > 0.001) {
      if (motionPreset === 'breathe') {
        const w = omega * s.freqMult + s.phaseOffset;
        radius = s.radius * (1 + 0.22 * amp * Math.sin(w));
        x += 14 * amp * Math.cos(w);
        y += 14 * amp * Math.sin(w * 1.0);
        angle += 0.12 * amp * Math.sin(w);
      } else if (motionPreset === 'orbit') {
        const w = omega + s.phaseOffset;
        x += s.orbitRadius * amp * Math.cos(w + s.orbitAngle);
        y += s.orbitRadius * amp * Math.sin(w + s.orbitAngle);
        radius = s.radius * (1 + 0.08 * amp * Math.sin(w));
        angle += 0.3 * amp * Math.sin(w);
      } else if (motionPreset === 'wave') {
        const diag = (s.x / width + s.y / height) * 0.5;
        const w = omega - Math.PI * 2 * diag;
        radius = s.radius * (1 + 0.25 * amp * Math.sin(w));
        x += 12 * amp * Math.cos(w);
        y += 18 * amp * Math.sin(w);
      }
    }

    const effectiveAspect = 1 + (s.aspect - 1) * aspectMix;
    return {
      id: s.id,
      x,
      y,
      radius,
      aspect: effectiveAspect,
      angle,
      cosA: Math.cos(-angle),
      sinA: Math.sin(-angle),
    };
  });
}

// Compute superellipse signed distance for a single bubble at (px, py)
function bubbleSDF(px: number, py: number, b: EvaluatedBubble, lpExp: number): number {
  const dx = px - b.x;
  const dy = py - b.y;
  const u = dx * b.cosA - dy * b.sinA;
  const v = dx * b.sinA + dy * b.cosA;

  const rx = b.radius * b.aspect;
  const ry = b.radius;

  if (Math.abs(lpExp - 2) < 0.05 && Math.abs(b.aspect - 1) < 0.02) {
    return Math.hypot(u, v) - ry;
  }

  const nx = Math.abs(u) / rx;
  const ny = Math.abs(v) / ry;

  // Numerically stable Lp norm
  const m = Math.max(nx, ny);
  if (m < 1e-6) return -Math.min(rx, ry);
  const ratio = Math.min(nx, ny) / m;
  const lp = m * Math.pow(1 + Math.pow(ratio, lpExp), 1 / lpExp);

  // Convert normalized distance to approximate pixel distance
  return (lp - 1) * ry;
}

// Polynomial smooth minimum (zero inflation on overlap, smooth capillary bridges)
function smin(a: number, b: number, k: number): number {
  if (k <= 0.001) return a < b ? a : b;
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return (a < b ? a : b) - 0.25 * h * h * k;
}

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  k1: string;
  k2: string;
}

// Edge table for Marching Squares (4-bit mask: TL=8, TR=4, BR=2, BL=1)
function extractIsoSegments(
  field: Float32Array,
  cols: number,
  rows: number,
  cellW: number,
  cellH: number,
  offsetX: number,
  offsetY: number,
  iso: number
): Segment[] {
  const segments: Segment[] = [];
  const q = (v: number) => Math.round(v * 100);

  for (let r = 0; r < rows - 1; r++) {
    const y0 = offsetY + r * cellH;
    const y1 = y0 + cellH;
    const rowOff = r * cols;
    const nextRowOff = (r + 1) * cols;

    for (let c = 0; c < cols - 1; c++) {
      const vTL = field[rowOff + c] - iso;
      const vTR = field[rowOff + c + 1] - iso;
      const vBR = field[nextRowOff + c + 1] - iso;
      const vBL = field[nextRowOff + c] - iso;

      const bTL = vTL < 0 ? 8 : 0;
      const bTR = vTR < 0 ? 4 : 0;
      const bBR = vBR < 0 ? 2 : 0;
      const bBL = vBL < 0 ? 1 : 0;
      const mask = bTL | bTR | bBR | bBL;

      if (mask === 0 || mask === 15) continue;

      const x0 = offsetX + c * cellW;
      const x1 = x0 + cellW;

      // Linear interpolation helpers (edge 0=top, 1=right, 2=bottom, 3=left)
      const interpTop = () => {
        const t = vTL / (vTL - vTR || 1e-6);
        return { x: x0 + t * cellW, y: y0, k: `h:${r}:${c}:${q(t)}` };
      };
      const interpRight = () => {
        const t = vTR / (vTR - vBR || 1e-6);
        return { x: x1, y: y0 + t * cellH, k: `v:${r}:${c + 1}:${q(t)}` };
      };
      const interpBottom = () => {
        const t = vBL / (vBL - vBR || 1e-6);
        return { x: x0 + t * cellW, y: y1, k: `h:${r + 1}:${c}:${q(t)}` };
      };
      const interpLeft = () => {
        const t = vTL / (vTL - vBL || 1e-6);
        return { x: x0, y: y0 + t * cellH, k: `v:${r}:${c}:${q(t)}` };
      };

      const pushSeg = (p1: { x: number; y: number; k: string }, p2: { x: number; y: number; k: string }) => {
        segments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, k1: p1.k, k2: p2.k });
      };

      switch (mask) {
        case 1:
        case 14:
          pushSeg(interpLeft(), interpBottom());
          break;
        case 2:
        case 13:
          pushSeg(interpBottom(), interpRight());
          break;
        case 3:
        case 12:
          pushSeg(interpLeft(), interpRight());
          break;
        case 4:
        case 11:
          pushSeg(interpTop(), interpRight());
          break;
        case 5: {
          // Saddle case: resolve via center average
          const avg = (vTL + vTR + vBR + vBL) * 0.25;
          if (avg < 0) {
            pushSeg(interpLeft(), interpTop());
            pushSeg(interpBottom(), interpRight());
          } else {
            pushSeg(interpLeft(), interpBottom());
            pushSeg(interpTop(), interpRight());
          }
          break;
        }
        case 6:
        case 9:
          pushSeg(interpTop(), interpBottom());
          break;
        case 7:
        case 8:
          pushSeg(interpLeft(), interpTop());
          break;
        case 10: {
          const avg = (vTL + vTR + vBR + vBL) * 0.25;
          if (avg < 0) {
            pushSeg(interpTop(), interpRight());
            pushSeg(interpLeft(), interpBottom());
          } else {
            pushSeg(interpLeft(), interpTop());
            pushSeg(interpBottom(), interpRight());
          }
          break;
        }
      }
    }
  }

  return segments;
}

interface Point {
  x: number;
  y: number;
}

// Stitch Marching Squares segments into ordered polylines (closed or open)
function stitchSegments(segments: Segment[]): Array<{ points: Point[]; closed: boolean }> {
  if (segments.length === 0) return [];

  // Build adjacency map using quantized coordinates as vertex keys so edges always connect cleanly
  const vKey = (x: number, y: number) => `${Math.round(x * 10)},${Math.round(y * 10)}`;
  const adj = new Map<string, Array<{ segIdx: number; other: Point; otherKey: string }>>();

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const k1 = vKey(s.x1, s.y1);
    const k2 = vKey(s.x2, s.y2);
    if (k1 === k2) continue;

    if (!adj.has(k1)) adj.set(k1, []);
    if (!adj.has(k2)) adj.set(k2, []);
    adj.get(k1)!.push({ segIdx: i, other: { x: s.x2, y: s.y2 }, otherKey: k2 });
    adj.get(k2)!.push({ segIdx: i, other: { x: s.x1, y: s.y1 }, otherKey: k1 });
  }

  const used = new Uint8Array(segments.length);
  const chains: Array<{ points: Point[]; closed: boolean }> = [];

  for (let i = 0; i < segments.length; i++) {
    if (used[i]) continue;
    used[i] = 1;

    const s = segments[i];
    const pts: Point[] = [
      { x: s.x1, y: s.y1 },
      { x: s.x2, y: s.y2 },
    ];
    let headKey = vKey(s.x1, s.y1);
    let tailKey = vKey(s.x2, s.y2);

    // Extend forward from tail
    while (true) {
      const neighbors = adj.get(tailKey);
      if (!neighbors) break;
      const next = neighbors.find((n) => !used[n.segIdx]);
      if (!next) break;
      used[next.segIdx] = 1;
      pts.push(next.other);
      tailKey = next.otherKey;
      if (tailKey === headKey) break;
    }

    let closed = tailKey === headKey;

    // If not closed, extend backward from head
    if (!closed) {
      while (true) {
        const neighbors = adj.get(headKey);
        if (!neighbors) break;
        const prev = neighbors.find((n) => !used[n.segIdx]);
        if (!prev) break;
        used[prev.segIdx] = 1;
        pts.unshift(prev.other);
        headKey = prev.otherKey;
        if (headKey === tailKey) {
          closed = true;
          break;
        }
      }
    }

    if (closed && pts.length > 2) {
      pts.pop(); // remove duplicate closing vertex
    }

    if (pts.length >= 2) {
      chains.push({ points: pts, closed });
    }
  }

  return chains;
}

// Ramer-Douglas-Peucker simplification
function simplifyPoints(pts: Point[], eps: number): Point[] {
  if (pts.length <= 2) return pts;
  let maxDist = 0;
  let index = 0;
  const first = pts[0];
  const last = pts[pts.length - 1];
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const lenSq = dx * dx + dy * dy;

  for (let i = 1; i < pts.length - 1; i++) {
    let dist: number;
    if (lenSq < 1e-6) {
      dist = Math.hypot(pts[i].x - first.x, pts[i].y - first.y);
    } else {
      const t = ((pts[i].x - first.x) * dx + (pts[i].y - first.y) * dy) / lenSq;
      const projX = first.x + t * dx;
      const projY = first.y + t * dy;
      dist = Math.hypot(pts[i].x - projX, pts[i].y - projY);
    }
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > eps) {
    const left = simplifyPoints(pts.slice(0, index + 1), eps);
    const right = simplifyPoints(pts.slice(index), eps);
    return left.slice(0, -1).concat(right);
  }
  return [first, last];
}

// Convert polyline to smooth Catmull-Rom Cubic Bezier SVG path string
function pointsToSmoothSvgPath(pts: Point[], closed: boolean, tension = 0.5): string {
  const n = pts.length;
  if (n < 2) return '';
  if (n === 2) {
    return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;
  }

  const fmt = (v: number) => v.toFixed(1);
  let d = `M ${fmt(pts[0].x)} ${fmt(pts[0].y)}`;
  const factor = tension / 3;

  const limit = closed ? n : n - 1;
  for (let i = 0; i < limit; i++) {
    const p0 = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[closed ? (i + 1) % n : i + 1];
    const p3 = pts[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) * factor;
    const cp1y = p1.y + (p2.y - p0.y) * factor;
    const cp2x = p2.x - (p3.x - p1.x) * factor;
    const cp2y = p2.y - (p3.y - p1.y) * factor;

    d += ` C ${fmt(cp1x)} ${fmt(cp1y)}, ${fmt(cp2x)} ${fmt(cp2y)}, ${fmt(p2.x)} ${fmt(p2.y)}`;
  }

  if (closed) d += ' Z';
  return d;
}

// Build single bubble path for 'overlap' internal arcs
function singleBubbleToSvgPath(b: EvaluatedBubble, lpExp: number): string {
  const steps = 40;
  const pts: Point[] = [];
  const rx = b.radius * b.aspect;
  const ry = b.radius;
  const exp = 2 / lpExp;

  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);
    const lx = Math.sign(cosT) * Math.pow(Math.abs(cosT), exp) * rx;
    const ly = Math.sign(sinT) * Math.pow(Math.abs(sinT), exp) * ry;
    // Rotate by +angle (inverse of -angle)
    const wx = b.x + lx * b.cosA + ly * b.sinA;
    const wy = b.y - lx * b.sinA + ly * b.cosA;
    pts.push({ x: wx, y: wy });
  }

  return pointsToSmoothSvgPath(pts, true, 0.52);
}

// Extract Voronoi / radical-axis junction seams where closest bubbles meet inside the ink silhouette
function extractJunctionSeams(
  field: Float32Array,
  nearestId: Int16Array,
  bubbles: EvaluatedBubble[],
  cols: number,
  rows: number,
  cellW: number,
  cellH: number,
  offsetX: number,
  offsetY: number,
  lpExp: number
): string[] {
  const segments: Segment[] = [];

  for (let r = 0; r < rows - 1; r++) {
    const y0 = offsetY + r * cellH;
    const y1 = y0 + cellH;
    const rowOff = r * cols;
    const nextRowOff = (r + 1) * cols;

    for (let c = 0; c < cols - 1; c++) {
      // Only compute seams inside or right on the ink boundary
      const fTL = field[rowOff + c];
      const fTR = field[rowOff + c + 1];
      const fBR = field[nextRowOff + c + 1];
      const fBL = field[nextRowOff + c];

      if (fTL > 2 && fTR > 2 && fBR > 2 && fBL > 2) continue;
      // Skip cells entirely outside
      if (fTL > 0 && fTR > 0 && fBR > 0 && fBL > 0) continue;

      const idTL = nearestId[rowOff + c];
      const idTR = nearestId[rowOff + c + 1];
      const idBR = nearestId[nextRowOff + c + 1];
      const idBL = nearestId[nextRowOff + c];

      if (idTL < 0 || idTR < 0 || idBR < 0 || idBL < 0) continue;
      if (idTL === idTR && idTR === idBR && idBR === idBL) continue;

      // Pick the two dominant bubble IDs in this cell
      const idA = idTL;
      let idB = -1;
      if (idTR !== idA) idB = idTR;
      else if (idBR !== idA) idB = idBR;
      else if (idBL !== idA) idB = idBL;
      if (idB < 0) continue;

      const bA = bubbles[idA];
      const bB = bubbles[idB];
      if (!bA || !bB) continue;

      const x0 = offsetX + c * cellW;
      const x1 = x0 + cellW;

      const diff = (x: number, y: number) => bubbleSDF(x, y, bA, lpExp) - bubbleSDF(x, y, bB, lpExp);

      const dTL = diff(x0, y0);
      const dTR = diff(x1, y0);
      const dBR = diff(x1, y1);
      const dBL = diff(x0, y1);

      const mask =
        (dTL < 0 ? 8 : 0) |
        (dTR < 0 ? 4 : 0) |
        (dBR < 0 ? 2 : 0) |
        (dBL < 0 ? 1 : 0);

      if (mask === 0 || mask === 15) continue;

      const pts: Point[] = [];
      const checkEdge = (v1: number, v2: number, px1: number, py1: number, px2: number, py2: number) => {
        if ((v1 < 0) !== (v2 < 0)) {
          const t = v1 / (v1 - v2 || 1e-6);
          pts.push({ x: px1 + t * (px2 - px1), y: py1 + t * (py2 - py1) });
        }
      };

      checkEdge(dTL, dTR, x0, y0, x1, y0);
      checkEdge(dTR, dBR, x1, y0, x1, y1);
      checkEdge(dBL, dBR, x0, y1, x1, y1);
      checkEdge(dTL, dBL, x0, y0, x0, y1);

      if (pts.length >= 2) {
        // Only keep endpoints that lie inside the outer ink contour (field <= 0.5)
        const midX = (pts[0].x + pts[1].x) * 0.5;
        const midY = (pts[0].y + pts[1].y) * 0.5;
        const avgF = (fTL + fTR + fBR + fBL) * 0.25;
        if (avgF <= 1.2 || (midX >= 0 && midY >= 0)) {
          segments.push({
            x1: pts[0].x,
            y1: pts[0].y,
            x2: pts[1].x,
            y2: pts[1].y,
            k1: '',
            k2: '',
          });
        }
      }
    }
  }

  const chains = stitchSegments(segments);
  return chains
    .filter((c) => c.points.length >= 3)
    .map((c) => {
      const simplified = simplifyPoints(c.points, 0.45);
      return pointsToSmoothSvgPath(simplified, c.closed, 0.5);
    })
    .filter(Boolean);
}

export function computeGeometryFrame(
  params: StudioParams,
  seeds: BubbleSeed[],
  phase: number,
  customOffsets: Record<number, { dx: number; dy: number }>
): GeometryFrame {
  const { width, height } = ASPECT_DIMENSIONS[params.aspectRatio];
  const bubbles = evaluateBubbles(
    seeds,
    phase,
    params.motionPreset,
    params.motionAmplitude,
    width,
    height,
    params.roundness,
    customOffsets
  );

  // Superellipse exponent: 2.0 (pure circle) to 6.2 (crisp architectural rounded squircle)
  const lpExp = 2.0 + (1 - params.roundness) * 4.2;

  // Smooth-min capillary bleed radius in pixels
  const bleedK = params.inkBleed * 88;

  // Pad grid slightly outside artboard so off-canvas shapes close cleanly and clip sharply at edges
  const pad = Math.max(48, Math.round(bleedK + 36));
  const evalW = width + pad * 2;
  const evalH = height + pad * 2;

  const targetGrid = 152;
  const aspect = evalW / evalH;
  const cols = aspect >= 1 ? targetGrid : Math.round(targetGrid * aspect);
  const rows = aspect >= 1 ? Math.round(targetGrid / aspect) : targetGrid;
  const cellW = evalW / (cols - 1);
  const cellH = evalH / (rows - 1);

  const total = cols * rows;
  const field = new Float32Array(total);
  field.fill(1e5);
  const nearestId = new Int16Array(total);
  nearestId.fill(-1);
  const nearestDist = new Float32Array(total);
  nearestDist.fill(1e5);

  const maxBand = bleedK + (params.doubleContour ? params.doubleContourOffset + 24 : 24);

  for (let bi = 0; bi < bubbles.length; bi++) {
    const b = bubbles[bi];
    const reachX = b.radius * b.aspect + maxBand;
    const reachY = b.radius + maxBand;

    const cMin = Math.max(0, Math.floor((b.x - reachX + pad) / cellW));
    const cMax = Math.min(cols - 1, Math.ceil((b.x + reachX + pad) / cellW));
    const rMin = Math.max(0, Math.floor((b.y - reachY + pad) / cellH));
    const rMax = Math.min(rows - 1, Math.ceil((b.y + reachY + pad) / cellH));

    for (let r = rMin; r <= rMax; r++) {
      const py = -pad + r * cellH;
      const rowOffset = r * cols;
      for (let c = cMin; c <= cMax; c++) {
        const px = -pad + c * cellW;
        const idx = rowOffset + c;
        const d = bubbleSDF(px, py, b, lpExp);

        if (d < nearestDist[idx]) {
          nearestDist[idx] = d;
          nearestId[idx] = bi;
        }
        field[idx] = smin(field[idx], d, bleedK);
      }
    }
  }

  const simpEps = 0.55;
  const curveTension = 0.38 + params.roundness * 0.24;

  const outerSegs = extractIsoSegments(field, cols, rows, cellW, cellH, -pad, -pad, 0);
  const outerChains = stitchSegments(outerSegs);
  const outerPaths = outerChains
    .filter((c) => c.points.length >= 4)
    .map((c) => pointsToSmoothSvgPath(simplifyPoints(c.points, simpEps), c.closed, curveTension))
    .filter(Boolean);

  let echoPaths: string[] = [];
  if (params.doubleContour) {
    const echoIso = -Math.max(4, params.doubleContourOffset);
    const echoSegs = extractIsoSegments(field, cols, rows, cellW, cellH, -pad, -pad, echoIso);
    const echoChains = stitchSegments(echoSegs);
    echoPaths = echoChains
      .filter((c) => c.points.length >= 4)
      .map((c) => pointsToSmoothSvgPath(simplifyPoints(c.points, simpEps), c.closed, curveTension))
      .filter(Boolean);
  }

  let seamPaths: string[] = [];
  if (params.junctionStyle === 'seam') {
    seamPaths = extractJunctionSeams(
      field,
      nearestId,
      bubbles,
      cols,
      rows,
      cellW,
      cellH,
      -pad,
      -pad,
      lpExp
    );
  }

  let individualPaths: string[] = [];
  if (params.junctionStyle === 'overlap') {
    individualPaths = bubbles.map((b) => singleBubbleToSvgPath(b, lpExp));
  }

  return {
    width,
    height,
    bubbles,
    outerPaths,
    echoPaths,
    seamPaths,
    individualPaths,
  };
}

export function buildSvgMarkup(
  frame: GeometryFrame,
  params: StudioParams,
  options: { includeTexture?: boolean } = {}
): string {
  const { width, height, outerPaths, echoPaths, seamPaths, individualPaths } = frame;
  const showFill = params.printMode === 'solid' || params.printMode === 'mixed';
  const showStroke = params.printMode === 'outline' || params.printMode === 'mixed';
  const strokeColor = params.printMode === 'solid' ? params.inkColor : params.lineColor;
  const includeTexture = Boolean(options.includeTexture && (params.grainIntensity > 0.02 || params.inkBleed > 0.15));

  const defs: string[] = [
    `<clipPath id="artboard-clip"><rect x="0" y="0" width="${width}" height="${height}" /></clipPath>`,
  ];

  if (outerPaths.length > 0 && (params.junctionStyle === 'overlap' || params.junctionStyle === 'seam')) {
    defs.push(
      `<clipPath id="outer-union-clip">${outerPaths.map((d) => `<path d="${d}" />`).join('')}</clipPath>`
    );
  }

  if (includeTexture) {
    const bleedScale = (params.inkBleed * 2.2).toFixed(2);
    defs.push(`
    <filter id="serigraphy-bleed" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="${params.seed}" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="${bleedScale}" xChannelSelector="R" yChannelSelector="G" />
    </filter>`);
    if (params.grainIntensity > 0.02) {
      defs.push(`
    <filter id="paper-grain" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="3" stitchTiles="stitch" result="grain" />
      <feColorMatrix type="saturate" values="0" in="grain" result="monoGrain" />
      <feComponentTransfer in="monoGrain" result="softGrain">
        <feFuncA type="linear" slope="${(params.grainIntensity * 0.14).toFixed(3)}" />
      </feComponentTransfer>
    </filter>`);
    }
  }

  const groupFilterAttr = includeTexture && params.inkBleed > 0.15 ? ' filter="url(#serigraphy-bleed)"' : '';

  const layers: string[] = [];

  // Background surface
  layers.push(`  <rect x="0" y="0" width="${width}" height="${height}" fill="${params.surfaceColor}" />`);

  // Artwork group clipped to artboard
  const artworkParts: string[] = [];

  if (showFill && outerPaths.length > 0) {
    artworkParts.push(
      `    <g id="ink-fill">${outerPaths
        .map((d) => `<path d="${d}" fill="${params.inkColor}" />`)
        .join('')}</g>`
    );
  }

  if (params.junctionStyle === 'overlap' && individualPaths.length > 0 && showStroke) {
    artworkParts.push(
      `    <g id="overlap-junctions" clip-path="url(#outer-union-clip)" opacity="0.42">${individualPaths
        .map(
          (d) =>
            `<path d="${d}" fill="none" stroke="${strokeColor}" stroke-width="${Math.max(
              0.6,
              params.strokeWidth * 0.72
            ).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" />`
        )
        .join('')}</g>`
    );
  }

  if (params.junctionStyle === 'seam' && seamPaths.length > 0 && showStroke) {
    artworkParts.push(
      `    <g id="junction-seams" clip-path="url(#outer-union-clip)" opacity="0.72">${seamPaths
        .map(
          (d) =>
            `<path d="${d}" fill="none" stroke="${strokeColor}" stroke-width="${Math.max(
              0.6,
              params.strokeWidth * 0.85
            ).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" />`
        )
        .join('')}</g>`
    );
  }

  if (params.doubleContour && echoPaths.length > 0 && showStroke) {
    artworkParts.push(
      `    <g id="double-contour" opacity="0.78">${echoPaths
        .map(
          (d) =>
            `<path d="${d}" fill="none" stroke="${strokeColor}" stroke-width="${Math.max(
              0.6,
              params.strokeWidth * 0.88
            ).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" />`
        )
        .join('')}</g>`
    );
  }

  if (showStroke && outerPaths.length > 0) {
    artworkParts.push(
      `    <g id="outer-contours">${outerPaths
        .map(
          (d) =>
            `<path d="${d}" fill="none" stroke="${strokeColor}" stroke-width="${params.strokeWidth.toFixed(
              2
            )}" stroke-linecap="round" stroke-linejoin="round" />`
        )
        .join('')}</g>`
    );
  }

  layers.push(
    `  <g id="serigraphy-artwork" clip-path="url(#artboard-clip)"${groupFilterAttr}>\n${artworkParts.join(
      '\n'
    )}\n  </g>`
  );

  if (includeTexture && params.grainIntensity > 0.02) {
    layers.push(
      `  <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" filter="url(#paper-grain)" style="mix-blend-mode:overlay" />`
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    ${defs.join('\n    ')}
  </defs>
${layers.join('\n')}
</svg>`;
}
