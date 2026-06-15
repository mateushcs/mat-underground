#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const require = createRequire(import.meta.url);

const transit = read("src/data/transit.ts");
const component = read("src/components/TransitMap.tsx");
const labelLayout = read("src/lib/labelLayout.ts");
const styles = read("src/styles.css");
const mapRules = read("MAP_RULES.md");

const failures = [];
const checks = [];

function ok(name) {
  checks.push(name);
}

function fail(name, message) {
  failures.push({ name, message });
}

function between(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  if (start < 0) return "";
  const end = endNeedle ? source.indexOf(endNeedle, start + startNeedle.length) : -1;
  return source.slice(start, end > start ? end : source.length);
}

function resolveLocalImport(specifier) {
  const base = path.join(root, "src", specifier.slice(2));
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return base;
}

async function loadTsRuntime(file) {
  const esbuild = require("esbuild");
  const result = await esbuild.build({
    entryPoints: [path.join(root, file)],
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
    plugins: [
      {
        name: "local-alias",
        setup(build) {
          build.onResolve({ filter: /^@\// }, (args) => ({ path: resolveLocalImport(args.path) }));
        },
      },
    ],
  });
  const module = { exports: {} };
  new Function("module", "exports", "require", result.outputFiles[0].text)(
    module,
    module.exports,
    require,
  );
  return module.exports;
}

async function loadTransitRuntime() {
  return loadTsRuntime("src/data/transit.ts");
}

function isOctolinear(dx, dy) {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  return ax < 1e-6 || ay < 1e-6 || Math.abs(ax - ay) < 1e-6;
}

function assertOctolinear(scope, id, from, to) {
  const dx = +(to.x - from.x).toFixed(6);
  const dy = +(to.y - from.y).toFixed(6);
  if (!isOctolinear(dx, dy)) {
    fail(scope, `${id}: segment ${from.x},${from.y} -> ${to.x},${to.y} is not 0/45/90 degrees`);
  }
}

const REQUIRED_RADIUS = 32;
const MAX_TERMINAL_LABEL_GAP = 6;
const MAX_STATION_LABEL_GAP = 70;
const TERMINAL_LABEL_GAP = 6;
const TERMINAL_SIDE_OFFSETS = [
  0, 8, -8, 14, -14, 22, -22, 32, -32, 44, -44, 56, -56, 68, -68, 82, -82, 96, -96, 120, -120,
];

function travelAngle(from, to) {
  const deg = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  return (((Math.round(deg / 45) * 45) % 360) + 360) % 360;
}

function turnAmount(prev, current, next) {
  const a = travelAngle(prev, current);
  const b = travelAngle(current, next);
  const raw = Math.abs(a - b);
  return Math.min(raw, 360 - raw);
}

function radiusWillStayFixed(prev, current, next, radius) {
  const d1x = current.x - prev.x;
  const d1y = current.y - prev.y;
  const d2x = next.x - current.x;
  const d2y = next.y - current.y;
  const len1 = Math.hypot(d1x, d1y);
  const len2 = Math.hypot(d2x, d2y);
  if (len1 < 0.01 || len2 < 0.01) return false;

  const u1x = -d1x / len1;
  const u1y = -d1y / len1;
  const u2x = d2x / len2;
  const u2y = d2y / len2;
  const dot = Math.max(-1, Math.min(1, u1x * u2x + u1y * u2y));
  const angle = Math.acos(dot);
  if (angle > Math.PI - 0.02) return true;

  const tangent = radius / Math.tan(angle / 2);
  const maxTangent = Math.min(len1, len2) / 2;
  return tangent <= maxTangent + 0.01;
}

function validateTurnsAndRadius(scope, id, points, closed) {
  const count = points.length;
  const first = closed ? 0 : 1;
  const last = closed ? count : count - 1;

  for (let i = first; i < last; i++) {
    const prev = points[(i - 1 + count) % count];
    const current = points[i % count];
    const next = points[(i + 1) % count];
    const turn = turnAmount(prev, current, next);
    if (turn === 0) continue;
    if (turn !== 45 && turn !== 90) {
      fail(
        scope,
        `${id}: corner at ${current.x},${current.y} turns ${turn} degrees; only 45 or 90 are allowed`,
      );
    }
    if (!radiusWillStayFixed(prev, current, next, REQUIRED_RADIUS)) {
      fail(
        scope,
        `${id}: corner at ${current.x},${current.y} is too short to keep radius ${REQUIRED_RADIUS}`,
      );
    }
  }
}

function extractRawLines() {
  const block = between(transit, "const RAW_LINES", "const RADIUS");
  const lineRe = /\{\s*id:\s*"([^"]+)"[\s\S]*?pts:\s*\[([\s\S]*?)\n\s*\],\s*\n\s*\}/g;
  const lines = [];

  for (const match of block.matchAll(lineRe)) {
    const source = match[0];
    const pts = [...match[2].matchAll(/\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/g)].map(
      (pt) => ({ x: Number(pt[1]), y: Number(pt[2]) }),
    );
    lines.push({
      id: match[1],
      closed: /closed:\s*true/.test(source),
      noPage: /noPage:\s*true/.test(source),
      stationPattern: source.match(/stationPattern:\s*"([^"]+)"/)?.[1] ?? "auto",
      pts,
    });
  }

  return lines;
}

function extractLandscapes(groupName, nextGroupName) {
  const block = between(
    transit,
    `export const ${groupName}`,
    nextGroupName ? `export const ${nextGroupName}` : undefined,
  );
  if (/\n\s*d:\s*"/.test(block)) {
    fail(
      `${groupName} corner radius`,
      `${groupName} must use landscapePath([...]), not a raw SVG path string`,
    );
  }

  const shapeRe = /id:\s*"([^"]+)"[\s\S]*?\n\s*d:\s*landscapePath\(\s*\[([\s\S]*?)\]\s*\)/g;
  return [...block.matchAll(shapeRe)].map((match) => {
    const points = [
      ...match[2].matchAll(/\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/g),
    ].map((pt) => ({ x: Number(pt[1]), y: Number(pt[2]) }));
    const segments = points.map((point, index) => [point, points[(index + 1) % points.length]]);
    return { id: match[1], points, segments };
  });
}

function boxOf(points) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function boxesOverlap(a, b) {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i];
    const pj = polygon[j];
    const crosses =
      pi.y > point.y !== pj.y > point.y &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y) + pi.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function ccw(a, b, c) {
  return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
}

function segmentsCross(a, b, c, d) {
  return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
}

function shapesOverlap(a, b) {
  if (!boxesOverlap(boxOf(a.points), boxOf(b.points))) return false;
  if (a.points.some((p) => pointInPolygon(p, b.points))) return true;
  if (b.points.some((p) => pointInPolygon(p, a.points))) return true;
  return a.segments.some(([a1, a2]) =>
    b.segments.some(([b1, b2]) => segmentsCross(a1, a2, b1, b2)),
  );
}

function validateLineGeometry(lines) {
  if (!lines.length) {
    fail("line geometry", "No RAW_LINES definitions found");
    return;
  }

  const ids = new Set();
  for (const line of lines) {
    if (ids.has(line.id)) fail("line ids", `Duplicate line id "${line.id}"`);
    ids.add(line.id);

    if (line.pts.length < 2) {
      fail("line geometry", `${line.id}: line must have at least two points`);
      continue;
    }
    for (let i = 1; i < line.pts.length; i++)
      assertOctolinear("line geometry", line.id, line.pts[i - 1], line.pts[i]);
    if (line.closed)
      assertOctolinear("line geometry", `${line.id} closed edge`, line.pts.at(-1), line.pts[0]);
    validateTurnsAndRadius("line curves", line.id, line.pts, line.closed);
  }

  ok(`${lines.length} line definitions use only straight, 45-degree, or 90-degree segments`);
  ok("line corners turn only 45 or 90 degrees and keep radius 32");
}

function validateRadius() {
  const radius = transit.match(/const RADIUS\s*=\s*(\d+)/)?.[1];
  if (radius !== String(REQUIRED_RADIUS)) {
    fail(
      "corner radius",
      `Expected const RADIUS = ${REQUIRED_RADIUS}, found ${radius ?? "nothing"}`,
    );
    return;
  }
  if (!/roundedPath\([\s\S]*RADIUS/.test(transit)) {
    fail("corner radius", "Line paths must be generated with roundedPath(..., RADIUS)");
    return;
  }
  ok("line curves are generated with radius 32");
}

function validateRulebookReference() {
  const pdfPath = "C:/Users/Mat/Downloads/One_Metro_World_Jug_Cerovic.pdf";
  const requiredRules = [
    "One_Metro_World_Jug_Cerovic.pdf",
    "map-visual-identity.png",
    "Nao substituir as assinaturas dos modais por um unico estilo generico",
    "Baldeacao regular usa uma unica capsula branca",
    "Nome de estacao terminal usa CAIXA ALTA e peso forte",
    "Badges vazados pertencem a light rail e BRT",
    "Todas as linhas tem nome e numero nas duas pontas",
    "Elementos de paisagem sao opcionais",
    "45 graus ou 90 graus",
    "Toda curva usa raio 32",
    "Nenhum texto pode sobrepor outro texto",
    "Baldeacoes ficam exatamente nas linhas que se cruzam",
    "Cada linha tem pelo menos uma baldeacao",
    "Baldeacoes seguem a legenda do PDF",
    "Nomes de estacoes nao usam quadrado/badge de linha",
    "Zoom minimo e o mapa inteiro em fill",
    "O mapa nao pode ser arrastado para fora das bordas",
  ];

  const missing = requiredRules.filter((rule) => !mapRules.includes(rule));
  if (missing.length) {
    fail("manual checklist", `MAP_RULES.md is missing: ${missing.join("; ")}`);
    return;
  }
  if (!fs.existsSync(pdfPath)) {
    fail("manual checklist", `Reference PDF was not found at ${pdfPath}`);
    return;
  }
  ok("manual/PDF checklist is recorded before map edits");
}

function validateLandscapes(groupName, shapes) {
  if (!shapes.length) {
    fail(`${groupName} geometry`, `No ${groupName} shapes found`);
    return;
  }

  for (const shape of shapes) {
    if (shape.points.length < 4)
      fail(`${groupName} geometry`, `${shape.id}: landscape must have at least four points`);
    for (const [from, to] of shape.segments)
      assertOctolinear(`${groupName} geometry`, shape.id, from, to);
    validateTurnsAndRadius(`${groupName} curves`, shape.id, shape.points, true);
  }

  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      if (shapesOverlap(shapes[i], shapes[j])) {
        fail(`${groupName} overlap`, `${shapes[i].id} overlaps ${shapes[j].id}`);
      }
    }
  }

  ok(`${groupName} shapes are octolinear, radius-32 rounded, and do not overlap each other`);
}

function estW(text, fontSize) {
  return Math.max(text.length * fontSize * 0.55, fontSize);
}

function terminalLabelPlacementFor(terminal, width, height, gap, sideOffset = 0) {
  const len = Math.hypot(terminal.dirX, terminal.dirY) || 1;
  const ux = terminal.dirX / len;
  const uy = terminal.dirY / len;
  const px = -uy;
  const py = ux;
  return {
    cx:
      terminal.x +
      ux * (gap + Math.abs(ux) * width * 0.5 + Math.abs(uy) * height * 0.5) +
      px * sideOffset,
    cy:
      terminal.y +
      uy * (gap + Math.abs(uy) * height * 0.5 + Math.abs(ux) * width * 0.5) +
      py * sideOffset,
  };
}

function terminalLabelMetricsFor(terminal, line) {
  const fs = 7.2;
  const badge = 13.8;
  const gap = 3.6;
  const text = line.name.toUpperCase();
  const textW = estW(text, fs);
  const vertical = Math.abs(terminal.dirY) > Math.abs(terminal.dirX) * 1.4;
  if (vertical) {
    return {
      vertical,
      fs,
      badge,
      gap,
      width: Math.max(textW, badge),
      height: badge + gap + fs * 1.1,
    };
  }
  return { vertical, fs, badge, gap, width: badge + gap + textW, height: badge };
}

function projectedGapToBox(box, point, terminal) {
  const len = Math.hypot(terminal.dirX, terminal.dirY) || 1;
  const ux = terminal.dirX / len;
  const uy = terminal.dirY / len;
  const p0 = point.x * ux + point.y * uy;
  const projections = [
    box.x * ux + box.y * uy,
    (box.x + box.w) * ux + box.y * uy,
    box.x * ux + (box.y + box.h) * uy,
    (box.x + box.w) * ux + (box.y + box.h) * uy,
  ];
  return Math.max(0, Math.min(...projections) - p0);
}

function terminalBadgeBox(terminal, center, metrics) {
  if (metrics.vertical) {
    const badgeY = terminal.dirY >= 0 ? -metrics.height / 2 : metrics.height / 2 - metrics.badge;
    return {
      x: center.cx - metrics.badge / 2,
      y: center.cy + badgeY,
      w: metrics.badge,
      h: metrics.badge,
    };
  }

  const reversed = terminal.dirX < -0.2;
  const badgeX = reversed ? metrics.width / 2 - metrics.badge : -metrics.width / 2;
  return {
    x: center.cx + badgeX,
    y: center.cy - metrics.badge / 2,
    w: metrics.badge,
    h: metrics.badge,
  };
}

function rectsOverlap(a, b, pad = 0) {
  return (
    a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y
  );
}

function rectFromCenter(cx, cy, w, h, id, text) {
  return { id, text, x: cx - w / 2, y: cy - h / 2, w, h };
}

function pointInRect(point, rect) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.w &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.h
  );
}

function orient(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function lineSegmentsIntersect(a, b, c, d) {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  return o1 * o2 <= 0 && o3 * o4 <= 0;
}

function segmentIntersectsRect(segment, rect, pad) {
  const r = {
    x: rect.x - pad,
    y: rect.y - pad,
    w: rect.w + pad * 2,
    h: rect.h + pad * 2,
  };
  const a = { x: segment.x1, y: segment.y1 };
  const b = { x: segment.x2, y: segment.y2 };
  if (pointInRect(a, r) || pointInRect(b, r)) return true;
  const corners = [
    { x: r.x, y: r.y },
    { x: r.x + r.w, y: r.y },
    { x: r.x + r.w, y: r.y + r.h },
    { x: r.x, y: r.y + r.h },
  ];
  for (let i = 0; i < corners.length; i++) {
    if (lineSegmentsIntersect(a, b, corners[i], corners[(i + 1) % corners.length])) return true;
  }
  return false;
}

function computeTerminalPlacements(runtimeData) {
  const lineById = new Map((runtimeData.lines ?? []).map((line) => [line.id, line]));
  const placed = new Map();
  const used = [];

  for (const terminal of runtimeData.lineTerminals ?? []) {
    const line = lineById.get(terminal.lineId);
    if (!line) continue;
    const metrics = terminalLabelMetricsFor(terminal, line);
    let best = terminalLabelPlacementFor(
      terminal,
      metrics.width,
      metrics.height,
      TERMINAL_LABEL_GAP,
    );

    for (const sideOffset of TERMINAL_SIDE_OFFSETS) {
      const candidate = terminalLabelPlacementFor(
        terminal,
        metrics.width,
        metrics.height,
        TERMINAL_LABEL_GAP,
        sideOffset,
      );
      const box = {
        x: candidate.cx - metrics.width / 2,
        y: candidate.cy - metrics.height / 2,
        w: metrics.width,
        h: metrics.height,
      };
      const softBox = { x: box.x - 5, y: box.y - 5, w: box.w + 10, h: box.h + 10 };
      if (
        !used.some((other) => rectsOverlap(softBox, other, 0.8)) &&
        !(runtimeData.lineSegments ?? []).some((segment) =>
          segmentIntersectsRect(segment, box, segment.weight / 2 + 0.8),
        )
      ) {
        best = candidate;
        break;
      }
    }

    const bestBox = {
      x: best.cx - metrics.width / 2 - 5,
      y: best.cy - metrics.height / 2 - 5,
      w: metrics.width + 10,
      h: metrics.height + 10,
    };
    placed.set(terminal.id, best);
    used.push(bestBox);
  }

  return placed;
}

const NORM180 = (angle) => ((angle % 180) + 180) % 180;
function perpDir(segAngle, side) {
  const rad = ((NORM180(segAngle) + 90) * Math.PI) / 180;
  let px = Math.cos(rad);
  let py = Math.sin(rad);
  if (Math.abs(px) < 1e-3) px = 0;
  if (Math.abs(py) < 1e-3) py = 0;
  return { px: px * side, py: py * side };
}

function makeLineObstacles(runtimeData) {
  const boxes = [];
  for (const seg of runtimeData.lineSegments ?? []) {
    const dx = seg.x2 - seg.x1;
    const dy = seg.y2 - seg.y1;
    const len = Math.hypot(dx, dy);
    const pad = seg.weight / 2 + 4;
    if (len < 1) continue;
    if (Math.abs(dx) < 0.01 || Math.abs(dy) < 0.01) {
      boxes.push({
        x: Math.min(seg.x1, seg.x2) - pad,
        y: Math.min(seg.y1, seg.y2) - pad,
        w: Math.abs(dx) + pad * 2,
        h: Math.abs(dy) + pad * 2,
      });
      continue;
    }
    const steps = Math.max(2, Math.ceil(len / 14));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = seg.x1 + dx * t;
      const y = seg.y1 + dy * t;
      boxes.push({ x: x - pad, y: y - pad, w: pad * 2, h: pad * 2 });
    }
  }
  return boxes;
}

function stationKind(station, linesByStation) {
  const ls = linesByStation.get(station.id) ?? [];
  const publicLineCount = ls.filter((line) => !line.noPage).length;
  if (station.kind === "major") return "major";
  if (station.kind === "interchange" || publicLineCount >= 2 || ls.length >= 2) {
    return "interchange";
  }
  if (station.kind === "terminal") return "terminal";
  return "regular";
}

function stationMarkerBox(station, kind, lineCount) {
  if (kind === "interchange") {
    const n = Math.max(2, lineCount || 2);
    const len = (n - 1) * 6.4 + 9;
    const a = (NORM180(station.segAngle ?? 0) * Math.PI) / 180;
    const hx = Math.abs((len / 2) * Math.cos(a)) + Math.abs(4.5 * Math.sin(a));
    const hy = Math.abs((len / 2) * Math.sin(a)) + Math.abs(4.5 * Math.cos(a));
    return { x: station.x - hx, y: station.y - hy, w: 2 * hx, h: 2 * hy };
  }
  if (kind === "major") return { x: station.x - 7.5, y: station.y - 7.5, w: 15, h: 15 };
  if (kind === "terminal") return { x: station.x - 4.2, y: station.y - 4.2, w: 8.4, h: 8.4 };
  return { x: station.x - 3, y: station.y - 3, w: 6, h: 6 };
}

function validateTextClearance(runtimeData, labelRuntime) {
  const lineById = new Map((runtimeData.lines ?? []).map((line) => [line.id, line]));
  const linesByStation = new Map();
  for (const station of runtimeData.stations ?? []) {
    linesByStation.set(
      station.id,
      (station.lines ?? []).map((id) => lineById.get(id)).filter(Boolean),
    );
  }

  const lineObstacles = makeLineObstacles(runtimeData);
  const markerBoxes = [];
  const items = [];
  const itemBoxes = new Map();
  const labelBoxes = [];
  const terminalPlacements = computeTerminalPlacements(runtimeData);

  for (const terminal of runtimeData.lineTerminals ?? []) {
    const line = lineById.get(terminal.lineId);
    if (!line) continue;
    const metrics = terminalLabelMetricsFor(terminal, line);
    const center =
      terminalPlacements.get(terminal.id) ??
      terminalLabelPlacementFor(terminal, metrics.width, metrics.height, TERMINAL_LABEL_GAP);
    const box = rectFromCenter(
      center.cx,
      center.cy,
      metrics.width,
      metrics.height,
      `terminal-${terminal.id}`,
      line.name,
    );
    labelBoxes.push(box);
    markerBoxes.push({ x: box.x - 5, y: box.y - 5, w: box.w + 10, h: box.h + 10 });
  }

  for (const line of runtimeData.lines ?? []) {
    if (!line.label) continue;
    const fs = 5.4;
    const box = {
      id: `route-${line.id}`,
      sx: line.label.x,
      sy: line.label.y,
      markerHalf: 2,
      bw: estW(line.label.text, fs),
      bh: fs * 1.25,
      perpX: 0,
      perpY: 1,
      priority: -1,
      obstacle: { x: line.label.x - 1.5, y: line.label.y - 1.5, w: 3, h: 3 },
      text: line.label.text,
    };
    items.push(box);
    itemBoxes.set(box.id, { w: box.bw, h: box.bh, text: box.text, regular: false });
  }

  for (const station of runtimeData.stations ?? []) {
    const ls = linesByStation.get(station.id) ?? [];
    const kind = stationKind(station, linesByStation);
    const secondaryOnly = ls.length > 0 && ls.every((line) => line.noPage);
    const mBox = stationMarkerBox(station, kind, ls.length);
    markerBoxes.push(mBox);
    if (secondaryOnly) continue;

    const { px, py } = perpDir(station.segAngle ?? 0, station.labelSide ?? 1);
    let bw;
    let bh;
    let markerHalf;
    let priority;
    if (kind === "interchange") {
      const fs = 6.4;
      const count = Math.max(1, ls.length);
      const cols = count <= 3 ? count : count === 4 ? 2 : 3;
      const rows = Math.ceil(count / cols);
      const badgeW = cols * 12.9 + (cols - 1) * 2.2;
      const badgeH = rows * 12.9 + (rows - 1) * 2.2;
      bw = Math.max(estW(station.name, fs), badgeW);
      bh = fs * 1.2 + 3.2 + badgeH;
      markerHalf = 10;
      priority = 0;
    } else if (kind === "terminal") {
      const fs = 4.2;
      bw = Math.max(estW(station.name.toUpperCase(), fs), 7);
      bh = fs * 1.2;
      markerHalf = 10;
      priority = 1;
    } else if (kind === "major") {
      const fs = 4.9;
      bw = estW(station.name, fs);
      bh = fs * 1.2;
      markerHalf = 7.5;
      priority = 2;
    } else {
      const fs = 3.9;
      bw = estW(station.name, fs);
      bh = fs * 1.2;
      markerHalf = 3;
      priority = 3;
    }

    const item = {
      id: station.id,
      sx: station.x,
      sy: station.y,
      markerHalf,
      bw,
      bh,
      perpX: px,
      perpY: py,
      priority,
      obstacle: mBox,
      text: station.name,
      angles:
        kind !== "interchange"
          ? station.labelAngle !== undefined
            ? [station.labelAngle]
            : labelRuntime.secondaryLabelAngles(station.segAngle ?? 0)
          : undefined,
    };
    items.push(item);
    itemBoxes.set(item.id, {
      w: bw,
      h: bh,
      text: station.name,
      angled: kind !== "interchange",
      sx: station.x,
      sy: station.y,
      markerHalf,
    });
  }

  const placements = labelRuntime.layoutLabels(items, markerBoxes, lineObstacles);
  const stationAngles = new Set();
  let maxStationGap = 0;
  let farthestStation = "";
  for (const [id, dims] of itemBoxes.entries()) {
    const placement = placements.get(id);
    if (!placement) {
      fail("label placement", `${id}: missing computed placement`);
      continue;
    }
    const bounds = labelRuntime.rotatedBounds(dims.w, dims.h, placement.angle ?? 0);
    labelBoxes.push(rectFromCenter(placement.cx, placement.cy, bounds.w, bounds.h, id, dims.text));
    if (dims.angled) {
      const angle = placement.angle ?? 0;
      stationAngles.add(angle);
      const dx = Math.max(0, Math.abs(placement.cx - dims.sx) - bounds.w / 2);
      const dy = Math.max(0, Math.abs(placement.cy - dims.sy) - bounds.h / 2);
      const stationGap = Math.max(0, Math.hypot(dx, dy) - dims.markerHalf);
      if (stationGap > maxStationGap) {
        maxStationGap = stationGap;
        farthestStation = `${id} at ${angle} degrees`;
      }
    }
  }

  const invalidAngles = [...stationAngles].filter((angle) => ![45, -45, 90, -90].includes(angle));
  if (invalidAngles.length) {
    fail(
      "station label orientation",
      `Non-interchange station labels use unsupported angles: ${invalidAngles.join(", ")}`,
    );
  } else if (maxStationGap > MAX_STATION_LABEL_GAP) {
    fail(
      "station label proximity",
      `${farthestStation}: label sits ${maxStationGap.toFixed(1)}px from its marker`,
    );
  } else {
    ok(
      `non-interchange station labels use 45/90-degree orientations and stay near their markers (max gap ${maxStationGap.toFixed(1)}px)`,
    );
  }

  const overlapOffenders = [];
  for (let i = 0; i < labelBoxes.length; i++) {
    for (let j = i + 1; j < labelBoxes.length; j++) {
      if (rectsOverlap(labelBoxes[i], labelBoxes[j], 0.8)) {
        overlapOffenders.push(
          `${labelBoxes[i].id} "${labelBoxes[i].text}" overlaps ${labelBoxes[j].id} "${labelBoxes[j].text}"`,
        );
      }
    }
  }

  const lineOffenders = [];
  for (const label of labelBoxes) {
    const hit = (runtimeData.lineSegments ?? []).find((segment) =>
      segmentIntersectsRect(segment, label, segment.weight / 2 + 0.8),
    );
    if (hit) {
      lineOffenders.push(`${label.id} "${label.text}" on ${hit.lineId}`);
    }
  }

  if (overlapOffenders.length || lineOffenders.length) {
    if (overlapOffenders.length) {
      fail("label overlap", `Text labels overlap: ${overlapOffenders.slice(0, 12).join("; ")}`);
    }
    if (lineOffenders.length) {
      fail(
        "label/line collision",
        `Text labels sit on line strokes: ${lineOffenders.slice(0, 12).join("; ")}`,
      );
    }
    return;
  }
  ok("station, route, and terminal labels do not overlap text or line strokes");
}

function validateTerminalLabels(runtimeData) {
  const block = between(transit, "export const lineTerminals", "export const lineSegments");
  if (!/RAW_LINES\.flatMap/.test(block)) {
    fail("terminal line labels", "lineTerminals must be generated from every RAW_LINES entry");
  }
  if (/if\s*\([^)]*rl\.id[^)]*\)\s*return\s*\[\]/.test(block) || /\^L\\d/.test(block)) {
    fail("terminal line labels", "lineTerminals must not filter out secondary lines");
  }
  if (!component.includes("lineTerminals.map")) {
    fail("terminal line labels", "TransitMap must render lineTerminals.map(...)");
  }
  if (component.includes("placements.get(`terminal-${terminal.id}`)")) {
    fail(
      "terminal line labels",
      "Terminal labels must stay near endpoints, not use collision layout placement",
    );
  }
  if (!component.includes("terminalLabelPlacement")) {
    fail("terminal line labels", "TransitMap must use terminalLabelPlacement for endpoint labels");
  }
  const gap = Number(component.match(/const TERMINAL_LABEL_GAP\s*=\s*(\d+)/)?.[1] ?? NaN);
  if (!Number.isFinite(gap) || gap > MAX_TERMINAL_LABEL_GAP) {
    fail(
      "terminal line labels",
      `Endpoint labels must stay within ${MAX_TERMINAL_LABEL_GAP}px; found gap ${gap}`,
    );
  }
  if (/extraGaps|crossOffsets/.test(component)) {
    fail("terminal line labels", "Endpoint labels cannot use fallback offsets away from line ends");
  }
  if (
    !component.includes("terminalLabelBox") ||
    !component.includes("markerBoxes.push(terminalLabelBox")
  ) {
    fail(
      "terminal line labels",
      "Endpoint labels must be reserved as obstacles for station/route labels",
    );
  }

  const linesById = new Map((runtimeData.lines ?? []).map((line) => [line.id, line]));
  const terminals = runtimeData.lineTerminals ?? [];
  const terminalOffenders = [];
  const terminalPlacements = computeTerminalPlacements(runtimeData);

  for (const line of runtimeData.lines ?? []) {
    const lineTerminals = terminals.filter((terminal) => terminal.lineId === line.id);
    if (lineTerminals.length !== 2) {
      terminalOffenders.push(
        `${line.id}: expected 2 endpoint labels, found ${lineTerminals.length}`,
      );
      continue;
    }
    if (!line.name || !line.shortName) {
      terminalOffenders.push(`${line.id}: endpoint labels need both name and number`);
    }
  }

  for (const terminal of terminals) {
    const line = linesById.get(terminal.lineId);
    if (!line) continue;
    if (Math.hypot(terminal.dirX, terminal.dirY) < 0.01) {
      terminalOffenders.push(`${terminal.id}: missing outward direction`);
      continue;
    }
    const metrics = terminalLabelMetricsFor(terminal, line);
    const center =
      terminalPlacements.get(terminal.id) ??
      terminalLabelPlacementFor(terminal, metrics.width, metrics.height, gap);
    const labelBox = {
      x: center.cx - metrics.width / 2,
      y: center.cy - metrics.height / 2,
      w: metrics.width,
      h: metrics.height,
    };
    const badgeBox = terminalBadgeBox(terminal, center, metrics);
    const point = { x: terminal.x, y: terminal.y };
    const labelGap = projectedGapToBox(labelBox, point, terminal);
    const badgeGap = projectedGapToBox(badgeBox, point, terminal);
    if (labelGap > MAX_TERMINAL_LABEL_GAP + 0.01) {
      terminalOffenders.push(`${terminal.id}: label starts ${labelGap.toFixed(1)}px from endpoint`);
    }
    if (badgeGap > MAX_TERMINAL_LABEL_GAP + 0.01) {
      terminalOffenders.push(
        `${terminal.id}: number badge starts ${badgeGap.toFixed(1)}px from endpoint`,
      );
    }
  }

  if (terminalOffenders.length) {
    fail("terminal line labels", terminalOffenders.slice(0, 12).join("; "));
    return;
  }
  ok("all line endpoint labels are generated and rendered near their line ends");
}

function validateMapInteractionBounds() {
  const clampUses = component.match(/clampViewToMap\(/g)?.length ?? 0;
  if (!component.includes("const MIN_ZOOM = 1")) {
    fail("map interaction bounds", "Map minimum zoom must stay at the full-map fill state");
  }
  if (
    !component.includes("function clampViewToMap") ||
    !component.includes("right / k - right") ||
    !component.includes("bottom / k - bottom") ||
    clampUses < 3
  ) {
    fail("map interaction bounds", "Pan and zoom must be clamped to the authored map bounds");
    return;
  }
  ok("map pan and zoom are clamped to the authored map bounds");
}

function validateVisualIdentity() {
  const stationBlock = between(component, '<g aria-label="stations">', '<g aria-label="labels"');
  if (!stationBlock.includes('fill="var(--map-station-fill)"')) {
    fail("station identity", "Station markers must use the off-white station fill token");
  }
  if (!/stroke="var\(--map-(ink|dot-ring)\)"/.test(stationBlock)) {
    fail("station identity", "Station markers must use the map ink/dot-ring border");
  }
  const stationStrokeWidths = [...stationBlock.matchAll(/strokeWidth=\{([\d.]+)\}/g)].map((match) =>
    Number(match[1]),
  );
  if (
    stationStrokeWidths.some((width) => width > 2) ||
    !stationBlock.includes('vectorEffect="non-scaling-stroke"')
  ) {
    fail(
      "station border weight",
      "Station and transfer borders must stay at or below 2px and not scale with zoom",
    );
  } else {
    ok("station and transfer borders stay present and stable while zooming");
  }
  if (!stationBlock.includes("hub-shell") || /hub-border|hub-fill/.test(stationBlock)) {
    fail(
      "transfer identity",
      "Transfer stations must render as one clean capsule, not clustered lobes",
    );
  }
  if (
    !component.includes('strokeLinecap="round"') ||
    !component.includes('strokeLinejoin="round"')
  ) {
    fail("line identity", "Lines must render with round caps and joins");
  }
  if (!component.includes("layoutLabels(")) {
    fail("label placement", "Station and route labels must use the collision-aware label layout");
  }
  if (!component.includes('className="interchange-line-badge"')) {
    fail(
      "transfer label identity",
      "Interchange labels must show square line-number badges beside or below the station name",
    );
  }
  if (!/const LINE_WEIGHT\s*=\s*(\d+)/.test(labelLayout)) {
    fail("label placement", "Label layout must weight line collisions");
  } else {
    const weight = Number(labelLayout.match(/const LINE_WEIGHT\s*=\s*(\d+)/)?.[1]);
    if (weight < 20) fail("label placement", `LINE_WEIGHT should stay high; found ${weight}`);
  }
  if (
    !component.includes(
      'const COLORED_LINE_IDS = new Set(["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"])',
    ) ||
    !component.includes('return COLORED_LINE_IDS.has(line.id) ? line.color : "line-grey"')
  ) {
    fail(
      "line color hierarchy",
      "Only the eight portfolio lines L1-L8 may keep color; every auxiliary line must render grey",
    );
  } else {
    ok("only the portfolio lines L1-L8 use color; all auxiliary lines render grey");
  }
  ok("station markers, transfer hubs, line strokes, and label layout match the visual rule set");
}

function validateAestheticModes() {
  // The map follows the visitor's system preference by default and offers a
  // plain light/dark toggle. The old multi-aesthetic selector must stay gone.
  const systemDefault =
    component.includes('useState<MapTheme>("light")') &&
    component.includes("setTheme(getStoredTheme())") &&
    component.includes("themeAttrs(theme)");
  if (!systemDefault || component.includes('className="map-aesthetic-control"')) {
    fail(
      "aesthetic mode",
      "Map must follow system light/dark preference and expose only a light/dark toggle, no aesthetic selector",
    );
  } else {
    ok("map follows system light/dark preference with a simple light/dark toggle");
  }

  if (
    component.includes('aria-label="water"') ||
    component.includes('aria-label="parks"') ||
    component.includes("map-water-halftone") ||
    component.includes("LAND_SHAPE_D")
  ) {
    fail("landscape omission", "Water, coastline, and parks must stay omitted from this map");
  } else {
    ok("water, coastline, and parks are omitted from the published map");
  }
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function projectStationOntoLine(station, segments) {
  let best = null;
  let traveled = 0;
  for (const segment of segments) {
    const dx = segment.x2 - segment.x1;
    const dy = segment.y2 - segment.y1;
    const len2 = dx * dx + dy * dy;
    const len = Math.sqrt(len2);
    if (len < 0.01) continue;
    const t = Math.max(
      0,
      Math.min(1, ((station.x - segment.x1) * dx + (station.y - segment.y1) * dy) / len2),
    );
    const x = segment.x1 + dx * t;
    const y = segment.y1 + dy * t;
    const off = Math.hypot(station.x - x, station.y - y);
    const pos = traveled + len * t;
    if (!best || off < best.off) best = { off, pos };
    traveled += len;
  }
  return best;
}

function validateStationSpacing(runtimeData, rawLines) {
  const rawById = new Map(rawLines.map((line) => [line.id, line]));
  const lines = runtimeData.lines ?? [];
  const stations = runtimeData.stations ?? [];
  const allSegments = runtimeData.lineSegments ?? [];
  const minRatio = 0.62;
  const maxRatio = 1.62;
  const offenders = [];

  for (const line of lines) {
    const raw = rawById.get(line.id);
    const segments = allSegments.filter((segment) => segment.lineId === line.id);
    if (!raw || segments.length < 1 || raw.stationPattern === "endpoints") continue;

    const lineStations = stations
      .filter((station) => station.lines?.includes(line.id))
      .map((station) => projectStationOntoLine(station, segments))
      .filter((projection) => projection && projection.off < 8)
      .map((projection) => projection.pos)
      .sort((a, b) => a - b);

    const unique = [];
    for (const pos of lineStations) {
      if (!unique.length || Math.abs(pos - unique.at(-1)) > 3) unique.push(pos);
    }
    if (unique.length < 4) continue;

    const totalLen = segments.reduce(
      (sum, segment) => sum + Math.hypot(segment.x2 - segment.x1, segment.y2 - segment.y1),
      0,
    );
    const gaps = [];
    for (let i = 1; i < unique.length; i++) gaps.push(unique[i] - unique[i - 1]);
    if (raw.closed) gaps.push(totalLen - unique.at(-1) + unique[0]);

    const usefulGaps = gaps.filter((gap) => gap > 12);
    if (usefulGaps.length < 3) continue;
    const typical = median(usefulGaps);
    const tooSmall = usefulGaps.filter((gap) => gap < typical * minRatio);
    const tooLarge = usefulGaps.filter((gap) => gap > typical * maxRatio);

    if (tooSmall.length || tooLarge.length) {
      offenders.push(
        `${line.id}: median ${typical.toFixed(1)}, min ${Math.min(...usefulGaps).toFixed(1)}, max ${Math.max(...usefulGaps).toFixed(1)}`,
      );
    }
  }

  if (offenders.length) {
    fail("station spacing", `Station gaps are uneven: ${offenders.slice(0, 8).join("; ")}`);
    return;
  }
  ok("station spacing stays visually even within each line");
}

function validateStationsOutsideWater(runtimeData, waterShapes) {
  const offenders = [];
  for (const station of runtimeData.stations ?? []) {
    for (const water of waterShapes) {
      if (pointInPolygon({ x: station.x, y: station.y }, water.points)) {
        offenders.push(
          `${station.name} (${station.lines?.join(",") ?? "no line"}) inside ${water.id}`,
        );
      }
    }
  }

  if (offenders.length) {
    fail(
      "logical landscape placement",
      `Stations cannot sit inside water: ${offenders.slice(0, 12).join("; ")}`,
    );
    return;
  }
  ok("no station sits inside water");
}

function validateNoDuplicateStations(runtimeData) {
  const stations = runtimeData.stations ?? [];
  const offenders = [];
  for (let i = 0; i < stations.length; i++) {
    for (let j = i + 1; j < stations.length; j++) {
      const a = stations[i];
      const b = stations[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 2) offenders.push(`${a.name} and ${b.name} are ${d.toFixed(1)}px apart`);
    }
  }
  if (offenders.length) {
    fail(
      "station uniqueness",
      `Stations cannot share the same spot: ${offenders.slice(0, 12).join("; ")}`,
    );
    return;
  }
  ok("no two station markers occupy the same spot");
}

function validateStationLineAlignment(runtimeData) {
  const segmentsByLine = new Map();
  for (const segment of runtimeData.lineSegments ?? []) {
    if (!segmentsByLine.has(segment.lineId)) segmentsByLine.set(segment.lineId, []);
    segmentsByLine.get(segment.lineId).push(segment);
  }

  const offenders = [];
  for (const station of runtimeData.stations ?? []) {
    for (const lineId of station.lines ?? []) {
      const projection = projectStationOntoLine(station, segmentsByLine.get(lineId) ?? []);
      if (!projection) {
        offenders.push(`${station.name}: no segment found for ${lineId}`);
        continue;
      }
      if (projection.off > 2.5) {
        offenders.push(`${station.name}: ${projection.off.toFixed(1)}px off ${lineId}`);
      }
    }
  }

  if (offenders.length) {
    fail(
      "station alignment",
      `Station dots/transfers must be centered on their lines: ${offenders.slice(0, 16).join("; ")}`,
    );
    return;
  }
  ok("station dots and transfers are centered on their served lines");
}

function validateLineTransfers(runtimeData) {
  const stations = runtimeData.stations ?? [];
  const offenders = [];
  for (const line of runtimeData.lines ?? []) {
    const hasTransfer = stations.some(
      (station) => station.lines?.includes(line.id) && (station.lines?.length ?? 0) >= 2,
    );
    if (!hasTransfer) offenders.push(line.id);
  }

  if (offenders.length) {
    fail("line transfers", `Every line needs at least one transfer: ${offenders.join(", ")}`);
    return;
  }
  ok("every line has at least one transfer with another line");
}

function validateEndpointStations(runtimeData, rawLines) {
  const stations = runtimeData.stations ?? [];
  const terminals = runtimeData.lineTerminals ?? [];
  const offenders = [];

  for (const line of rawLines) {
    if (line.closed) continue;
    const endpoints = terminals.filter((terminal) => terminal.lineId === line.id);
    for (const endpoint of endpoints) {
      const hasStation = stations.some(
        (station) =>
          station.lines?.includes(line.id) &&
          Math.hypot(station.x - endpoint.x, station.y - endpoint.y) < 2,
      );
      if (!hasStation) offenders.push(endpoint.id);
    }
  }

  if (offenders.length) {
    fail("endpoint stations", `Open line ends without station markers: ${offenders.join(", ")}`);
    return;
  }
  ok("every open line has a station marker at both endpoints");
}

function validateLineNumbers(runtimeData) {
  const lines = runtimeData.lines ?? [];
  const invalid = lines.filter((line) => !/^\d{2}$/.test(line.shortName));
  const outOfRange = lines.filter((line) => {
    const number = Number(line.shortName);
    return number < 1 || number > 99;
  });
  const counts = new Map();
  for (const line of lines) {
    counts.set(line.shortName, (counts.get(line.shortName) ?? 0) + 1);
  }
  const duplicates = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([number]) => number);

  if (invalid.length || outOfRange.length || duplicates.length) {
    const issues = [];
    if (invalid.length) {
      issues.push(`non-numeric labels: ${invalid.map((line) => line.id).join(", ")}`);
    }
    if (outOfRange.length) {
      issues.push(`outside 01-99: ${outOfRange.map((line) => line.id).join(", ")}`);
    }
    if (duplicates.length) issues.push(`duplicate numbers: ${duplicates.join(", ")}`);
    fail("line numbering", issues.join("; "));
    return;
  }

  ok("all visible line numbers are unique two-digit values from 01 to 99");
}

function validateParallelLines(runtimeData) {
  const segs = runtimeData.lineSegments ?? [];
  const offenders = [];
  const seen = new Set();
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const a = segs[i];
      const b = segs[j];
      if (a.lineId === b.lineId) continue;
      const adx = a.x2 - a.x1;
      const ady = a.y2 - a.y1;
      const bdx = b.x2 - b.x1;
      const bdy = b.y2 - b.y1;
      const alen = Math.hypot(adx, ady);
      const blen = Math.hypot(bdx, bdy);
      if (alen < 10 || blen < 10) continue;
      const aux = adx / alen;
      const auy = ady / alen;
      // Parallel test: the cross product of the unit directions must be ~0.
      if (Math.abs(aux * bdy - auy * bdx) / blen > 0.06) continue;
      // Perpendicular distance between the two parallel lines.
      const perp = Math.abs((b.x1 - a.x1) * auy - (b.y1 - a.y1) * aux);
      if (perp > a.weight / 2 + b.weight / 2 + 0.6) continue; // strokes don't stack
      // Overlap length measured along line a's direction.
      const pb1 = (b.x1 - a.x1) * aux + (b.y1 - a.y1) * auy;
      const pb2 = (b.x2 - a.x1) * aux + (b.y2 - a.y1) * auy;
      const overlap = Math.min(alen, Math.max(pb1, pb2)) - Math.max(0, Math.min(pb1, pb2));
      if (overlap > 16) {
        const key = [a.lineId, b.lineId].sort().join("~");
        if (!seen.has(key)) {
          seen.add(key);
          offenders.push(`${a.lineId} runs stacked over ${b.lineId} for ~${overlap.toFixed(0)}px`);
        }
      }
    }
  }
  if (offenders.length) {
    fail(
      "parallel lines",
      `Lines must never run on top of another line in parallel: ${offenders.slice(0, 10).join("; ")}`,
    );
    return;
  }
  ok("no two lines run stacked on top of each other in parallel");
}

const lines = extractRawLines();
const runtimeData = await loadTransitRuntime();
const labelRuntime = await loadTsRuntime("src/lib/labelLayout.ts");
validateRulebookReference();
validateLineGeometry(lines);
validateRadius();
validateTerminalLabels(runtimeData);
validateMapInteractionBounds();
validateVisualIdentity();
validateAestheticModes();
validateStationSpacing(runtimeData, lines);
validateParallelLines(runtimeData);
validateNoDuplicateStations(runtimeData);
validateStationLineAlignment(runtimeData);
validateLineTransfers(runtimeData);
validateEndpointStations(runtimeData, lines);
validateLineNumbers(runtimeData);
validateTextClearance(runtimeData, labelRuntime);

if (failures.length) {
  console.error("\nMap rules failed:\n");
  for (const failure of failures) console.error(`- ${failure.name}: ${failure.message}`);
  console.error("\nFix the map before shipping.\n");
  process.exit(1);
}

console.log("Map rules passed:");
for (const check of checks) console.log(`- ${check}`);
