import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { flushSync } from "react-dom";
import "@/map-menu.css";
import {
  stations as allStations,
  lines as allLines,
  lineSegments,
  lineTerminals,
  type Line,
  type StationKind,
} from "@/data/transit";
import {
  isContactLine,
  stationSlugForLine,
  stationSlugForLines,
} from "@/data/portfolioStations";
import { portfolioContent } from "@/data/portfolioContent";
import { getStationContent } from "@/data/caseEditorial";
import { posterUrlFor } from "@/lib/posters";
import {
  getStoredLanguage,
  htmlLang,
  LANGUAGES,
  setStoredLanguage,
  type ContentLang,
} from "@/lib/language";
import { getStoredTheme, setStoredTheme, themeAttrs, withThemeFade, type MapTheme } from "@/lib/theme";
import { BookOpen, Moon, Sun } from "lucide-react";
import { layoutLabels, secondaryLabelAngles, type Box, type LabelItem } from "@/lib/labelLayout";
import { useRouteTransition, type DissolveOrigin } from "@/components/RouteTransition";
import { ContactModal } from "@/components/ContactModal";
import { MovingTrains } from "@/components/MovingTrains";
import { CityBlueprint, type CityBlueprintHandle } from "@/components/CityBlueprint";
import { MeshGradient } from "@/components/MeshGradient";
import { isLitePerf } from "@/lib/perf";
import { HomeDisc } from "@/components/HomeDisc";
import { PartyMode } from "@/components/PartyMode";

import "@/map-atmosphere.css";
import "@/chrome.css";

// Schematic board the geometry is authored in (centered map space).
const VIEWBOX = { x: -810, y: -455, w: 1615, h: 1055 };

// --- Label / marker placement helpers ---
// Preferred perpendicular launch direction for a label, normalised to [0,180) so
// the side is stable regardless of segment travel direction. `side` (±1) flips it.
const NORM180 = (a: number) => ((a % 180) + 180) % 180;
function perpDir(segAngle: number, side: number) {
  const rad = ((NORM180(segAngle) + 90) * Math.PI) / 180;
  let px = Math.cos(rad);
  let py = Math.sin(rad);
  if (Math.abs(px) < 1e-3) px = 0;
  if (Math.abs(py) < 1e-3) py = 0;
  return { px: px * side, py: py * side };
}
const lineNumber = (shortName: string) => shortName;
// Rough label width in map units (Graphik average glyph).
const estW = (text: string, fontSize: number) => Math.max(text.length * fontSize * 0.55, fontSize);
const TERMINAL_LABEL_GAP = 6;
const TERMINAL_SIDE_OFFSETS = [
  0, 8, -8, 14, -14, 22, -22, 32, -32, 44, -44, 56, -56, 68, -68, 82, -82, 96, -96, 120, -120,
];
const TERMINAL_LINE_NAME_SIZE = 7.2;
const TERMINAL_LINE_BADGE_SIZE = 21.8;
const TERMINAL_LINE_BADGE_GAP = 3.6;
const TERMINAL_LINE_NUMBER_SIZE = 11;
const TERMINAL_STATION_NAME_SIZE = 4.2;
function terminalLabelPlacement(
  terminal: { x: number; y: number; dirX: number; dirY: number },
  width: number,
  height: number,
  sideOffset = 0,
) {
  const len = Math.hypot(terminal.dirX, terminal.dirY) || 1;
  const ux = terminal.dirX / len;
  const uy = terminal.dirY / len;
  const px = -uy;
  const py = ux;
  return {
    cx:
      terminal.x +
      ux * (TERMINAL_LABEL_GAP + Math.abs(ux) * width * 0.5 + Math.abs(uy) * height * 0.5) +
      px * sideOffset,
    cy:
      terminal.y +
      uy * (TERMINAL_LABEL_GAP + Math.abs(uy) * height * 0.5 + Math.abs(ux) * width * 0.5) +
      py * sideOffset,
  };
}
function terminalLabelReversed(terminal: { dirX: number }) {
  return terminal.dirX < -0.2;
}
function terminalLabelVertical(terminal: { dirX: number; dirY: number }) {
  return Math.abs(terminal.dirY) > Math.abs(terminal.dirX) * 1.4;
}
function terminalLabelMetrics(
  terminal: { dirX: number; dirY: number },
  text: string,
  fontSize: number,
  badge: number,
  gap: number,
) {
  const textW = estW(text, fontSize);
  if (terminalLabelVertical(terminal)) {
    return { vertical: true, width: Math.max(textW, badge), height: badge + gap + fontSize * 1.1 };
  }
  return { vertical: false, width: badge + gap + textW, height: badge };
}
function terminalLabelBox(center: { cx: number; cy: number }, width: number, height: number): Box {
  const pad = 5;
  return {
    x: center.cx - width / 2 - pad,
    y: center.cy - height / 2 - pad,
    w: width + pad * 2,
    h: height + pad * 2,
  };
}
function boxesOverlap(a: Box, b: Box, pad = 0) {
  return (
    a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y
  );
}
function pointInBox(point: { x: number; y: number }, box: Box) {
  return (
    point.x >= box.x && point.x <= box.x + box.w && point.y >= box.y && point.y <= box.y + box.h
  );
}
function orient(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}
function segmentsIntersect(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  d: { x: number; y: number },
) {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  return o1 * o2 <= 0 && o3 * o4 <= 0;
}
function segmentIntersectsBox(
  seg: { x1: number; y1: number; x2: number; y2: number; weight: number },
  box: Box,
) {
  const pad = seg.weight / 2 + 0.8;
  const r = {
    x: box.x - pad,
    y: box.y - pad,
    w: box.w + pad * 2,
    h: box.h + pad * 2,
  };
  const a = { x: seg.x1, y: seg.y1 };
  const b = { x: seg.x2, y: seg.y2 };
  if (pointInBox(a, r) || pointInBox(b, r)) return true;
  const corners = [
    { x: r.x, y: r.y },
    { x: r.x + r.w, y: r.y },
    { x: r.x + r.w, y: r.y + r.h },
    { x: r.x, y: r.y + r.h },
  ];
  return corners.some((corner, i) => segmentsIntersect(a, b, corner, corners[(i + 1) % 4]));
}
// Language list + storage helpers live in @/lib/language so the map, the station
// pages and the reading mode all share one source.
type Language = ContentLang;

const ACTIVE_LINE_IDS = ["L1", "L2", "L9", "L3", "L4", "L5", "L7", "L8"] as const;
const COLORED_LINE_IDS = new Set(["L1", "L2", "L3", "L4", "L5", "L7", "L8", "L9"]);
const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
// Camera easing rates (1/s): higher follows input more tightly.
const CAMERA_RESPONSE_PAN = 32;
const CAMERA_RESPONSE_PINCH = 36;
const CAMERA_RESPONSE_ZOOM = 11;
// Wheel zoom sensitivity per wheel-delta pixel (mouse) and per trackpad pinch delta.
const WHEEL_ZOOM_SPEED = 0.0024;
const PINCH_WHEEL_ZOOM_SPEED = 0.012;
const DESKTOP_INITIAL_VIEW: ViewState = { x: 0, y: 0, k: 2.35 };
const MOBILE_INITIAL_VIEW: ViewState = { x: 0, y: 0, k: 3.55 };
const MAP_VIEW_STORAGE_KEY = "mats-map-view";
// Opacity for everything that is NOT the focused line while a menu row is hovered.
const FOCUS_DIM = 0.12;
const TRANSFER_HUB_DOT_GAP = 7.2;
const INTERCHANGE_BADGE_SIZE = 20.9;
const INTERCHANGE_BADGE_GAP = 2.8;
const INTERCHANGE_NAME_GAP = 3.2;

// Line names in the menu/labels come straight from the editable content file,
// so renaming a station there updates the map too.
const lineCopy: Record<Language, Record<string, string>> = { pt: {}, en: {} };
for (const [lineId, byLang] of Object.entries(portfolioContent)) {
  for (const lang of ["pt", "en"] as const) {
    lineCopy[lang][lineId] = byLang[lang].title;
  }
}

const LINE_SUBTITLES: Record<string, Record<Language, string>> = {
  L1: { pt: "Euzinho", en: "Euzinho" },
  L2: { pt: "Tracbel", en: "Tracbel" },
  L9: { pt: "Tour House", en: "Tour House" },
  L3: { pt: "Neo Ventures", en: "Neo Ventures" },
  L4: { pt: "TIM AWC", en: "TIM AWC" },
  L8: { pt: "Fale comigo", en: "Get in touch" },
};

/** Lines that show a waveform glyph instead of a text subtitle (e.g. Músicas). */
const WAVEFORM_SUBTITLE_LINE_IDS = new Set(["L5"]);

/** Small audio-waveform glyph used as the subtitle for the music line. */
function MenuWaveform() {
  const bars = [4, 8, 12, 6, 14, 9, 5, 13, 7, 11, 4, 8];
  return (
    <svg className="map-waveform" viewBox="0 0 40 16" fill="currentColor" aria-hidden="true">
      {bars.map((h, i) => (
        <rect key={i} x={i * 3.4} y={(16 - h) / 2} width={2} height={h} />
      ))}
    </svg>
  );
}

/** Hover preview card state/anchoring for the menu rows and the map stations. */
export type PreviewRect = { left: number; top: number; right: number; bottom: number };
export type PreviewState = { lineId: string; rect: PreviewRect; follow?: boolean };

const PREVIEW_LABELS: Record<ContentLang, { client: string; company: string; role: string }> = {
  pt: { client: "Cliente", company: "Empresa", role: "Função" },
  en: { client: "Client", company: "Company", role: "Role" },
};

/** One- or two-line summary + cover + client/company for a line's preview card. */
function getLinePreview(lineId: string, lang: ContentLang) {
  const content = getStationContent(lineId, lang);
  if (!content) return null;
  const slug = stationSlugForLine(lineId);
  return {
    title: content.title,
    summary: content.summary ?? content.role,
    cover: content.cover?.src ?? (slug ? posterUrlFor(slug) : undefined),
    company: content.header?.company,
    client: content.header?.client,
    role: content.role,
  };
}

const PREVIEW_WIDTH = 300;
const PREVIEW_EST_HEIGHT = 280;

/** Place the card beside a rect (menu row, station) or a 1px rect at the cursor. */
function placePreview(rect: PreviewRect, height = PREVIEW_EST_HEIGHT, gap = 16) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  let left = rect.right + gap;
  if (left + PREVIEW_WIDTH > vw - 12) left = rect.left - PREVIEW_WIDTH - gap;
  left = Math.max(12, Math.min(left, vw - PREVIEW_WIDTH - 12));
  let top = rect.top + (rect.bottom - rect.top) / 2 - height / 2;
  top = Math.max(12, Math.min(top, vh - height - 12));
  return { left, top };
}

function MapPreviewCard({
  preview,
  lang,
  leaving,
  cardRef,
  onPointerEnter,
  onPointerLeave,
  onOpen,
}: {
  preview: PreviewState;
  lang: ContentLang;
  leaving: boolean;
  cardRef: React.RefObject<HTMLDivElement | null>;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onOpen: (lineId: string, x: number, y: number) => void;
}) {
  const data = getLinePreview(preview.lineId, lang);
  if (!data) return null;
  const line = allLines.find((l) => l.id === preview.lineId);
  const { left, top } = placePreview(preview.rect, PREVIEW_EST_HEIGHT, preview.follow ? 22 : 16);
  const labels = PREVIEW_LABELS[lang];
  const accent = line ? `var(--${lineVisualColor(line)})` : "#fff";
  const number = line ? lineNumber(line.shortName) : "";
  // Cursor-following cards must not catch the pointer (they would steal the
  // line hover); menu cards can be hovered and clicked.
  const interactive = !preview.follow;
  return (
    <div
      ref={cardRef}
      className="map-preview"
      data-leaving={leaving ? "true" : undefined}
      data-follow={preview.follow ? "true" : undefined}
      style={{ left, top, "--preview-accent": accent, pointerEvents: interactive ? "auto" : "none", cursor: interactive ? "pointer" : undefined } as CSSProperties}
      aria-hidden="true"
      onPointerEnter={interactive ? onPointerEnter : undefined}
      onPointerLeave={interactive ? onPointerLeave : undefined}
      onClick={interactive ? (event) => onOpen(preview.lineId, event.clientX, event.clientY) : undefined}
    >
      {data.cover && (
        <div className="map-preview-cover">
          <img src={data.cover} alt="" loading="lazy" />
        </div>
      )}
      <div className="map-preview-body">
        <span className="map-preview-tag">
          <i />
          {lang === "en" ? "Line" : "Linha"} {number}
        </span>
        <strong className="map-preview-title">{data.title}</strong>
        <p className="map-preview-summary">{data.summary}</p>
        <dl className="map-preview-meta">
          {data.client && (
            <div>
              <dt>{labels.client}</dt>
              <dd>{data.client}</dd>
            </div>
          )}
          {data.company && (
            <div>
              <dt>{labels.company}</dt>
              <dd>{data.company}</dd>
            </div>
          )}
          {!data.company && !data.client && data.role && (
            <div>
              <dt>{labels.role}</dt>
              <dd>{data.role}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

function pointToSegmentDistance(
  point: { x: number; y: number },
  segment: { x1: number; y1: number; x2: number; y2: number },
) {
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared < 0.01) return Math.hypot(point.x - segment.x1, point.y - segment.y1);
  const t = Math.max(
    0,
    Math.min(1, ((point.x - segment.x1) * dx + (point.y - segment.y1) * dy) / lengthSquared),
  );
  return Math.hypot(point.x - (segment.x1 + dx * t), point.y - (segment.y1 + dy * t));
}

function lineWidth(line: Line) {
  if (line.kind === "commuter") return line.weight ?? 5;
  if (line.kind === "brt") return line.weight ?? 4.2;
  if (line.kind === "light-rail") return line.weight ?? 2.8;
  if (
    line.kind === "tram" ||
    line.kind === "bus" ||
    line.kind === "ferry" ||
    line.kind === "cable-car"
  ) {
    return line.weight ?? 2.4;
  }
  return line.weight ?? 4;
}

function lineDash(line: Line) {
  return line.dashed ? "7 5" : undefined;
}

function snappedArrowAngle(angle: number) {
  return Math.round(angle / 45) * 45;
}

function makeLineObstacles(): Box[] {
  const boxes: Box[] = [];
  for (const seg of lineSegments) {
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

function transferHubGrid(lineCount: number) {
  const count = Math.max(1, lineCount);
  const cols = count <= 3 ? count : count === 4 ? 2 : 3;
  const rows = Math.ceil(count / cols);
  return { count, cols, rows };
}

// Book-style transfer: one white capsule laid ALONG the line, with one coloured
// dot per served line spaced down the line axis (so every dot stays centred on
// the stroke). `len` runs along the line, `thick` across it.
function transferHubSize(lineCount: number) {
  const n = Math.max(1, lineCount);
  return {
    len: 10 + (n - 1) * TRANSFER_HUB_DOT_GAP,
    thick: 9,
  };
}

function transferHubDotPositions(lineCount: number) {
  const n = Math.max(1, lineCount);
  return Array.from({ length: n }, (_, i) => ({
    along: (i - (n - 1) / 2) * TRANSFER_HUB_DOT_GAP,
  }));
}

function interchangeBadgeMetrics(lineCount: number) {
  const { count, cols, rows } = transferHubGrid(lineCount);
  return {
    count,
    cols,
    rows,
    w: cols * INTERCHANGE_BADGE_SIZE + (cols - 1) * INTERCHANGE_BADGE_GAP,
    h: rows * INTERCHANGE_BADGE_SIZE + (rows - 1) * INTERCHANGE_BADGE_GAP,
  };
}

function lineVisualColor(line: Line) {
  return COLORED_LINE_IDS.has(line.id) ? line.color : "line-grey";
}

// Grey (non L1-L7) lines carry number squares half the size of the coloured
// lines, so the coloured network stays the dominant signal.
const GREY_BADGE_SCALE = 0.5;
function badgeScale(line: Line) {
  return COLORED_LINE_IDS.has(line.id) ? 1 : GREY_BADGE_SCALE;
}

function lineBadgeFill(line: Line) {
  // Box fill is the line's own colour, identical to the menu number squares and
  // the stroke — so every badge reads as the same colour as its line.
  return `var(--${lineVisualColor(line)})`;
}

function lineBadgeTextFill() {
  return "rgba(255,255,255,0.92)";
}

function terminalBadgeAppearance(line: Line) {
  const color = `var(--${lineVisualColor(line)})`;
  if (
    line.kind === "tram" ||
    line.kind === "bus" ||
    line.kind === "ferry" ||
    line.kind === "cable-car"
  ) {
    return { fill: "transparent", stroke: "transparent", text: color };
  }
  if (line.kind === "light-rail" || line.kind === "brt") {
    return { fill: "var(--map-bg)", stroke: color, text: color };
  }
  return { fill: lineBadgeFill(line), stroke: "var(--map-bg)", text: lineBadgeTextFill() };
}

interface ViewState {
  x: number;
  y: number;
  k: number;
}

type MapViewportKind = "mobile" | "desktop";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function clampViewToMap(next: ViewState): ViewState {
  const k = clamp(next.k, MIN_ZOOM, MAX_ZOOM);
  const left = VIEWBOX.x;
  const right = VIEWBOX.x + VIEWBOX.w;
  const top = VIEWBOX.y;
  const bottom = VIEWBOX.y + VIEWBOX.h;

  return {
    x: clamp(next.x, right / k - right, left / k - left),
    y: clamp(next.y, bottom / k - bottom, top / k - top),
    k,
  };
}

let rememberedMapView: ViewState | null = null;

function mapViewportKind(): MapViewportKind {
  if (typeof window === "undefined") return "desktop";
  return window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
}

function initialMapView() {
  return mapViewportKind() === "mobile" ? MOBILE_INITIAL_VIEW : DESKTOP_INITIAL_VIEW;
}

function parseStoredMapView(
  raw: string | null,
): { view: ViewState; viewport?: MapViewportKind } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ViewState> & { viewport?: string };
    if (
      typeof parsed.x !== "number" ||
      typeof parsed.y !== "number" ||
      typeof parsed.k !== "number"
    ) {
      return null;
    }
    const viewport: MapViewportKind | undefined =
      parsed.viewport === "mobile" || parsed.viewport === "desktop" ? parsed.viewport : undefined;
    return { view: clampViewToMap({ x: parsed.x, y: parsed.y, k: parsed.k }), viewport };
  } catch {
    return null;
  }
}

function getRememberedMapView() {
  if (rememberedMapView) return rememberedMapView;
  if (typeof window === "undefined") return DESKTOP_INITIAL_VIEW;
  const viewport = mapViewportKind();
  const initial = initialMapView();
  const stored = parseStoredMapView(window.sessionStorage.getItem(MAP_VIEW_STORAGE_KEY));
  const legacyDesktopDefaultOnMobile =
    !!stored &&
    !stored.viewport &&
    viewport === "mobile" &&
    stored.view.k <= DESKTOP_INITIAL_VIEW.k + 0.05;
  rememberedMapView =
    stored && stored.viewport !== undefined && stored.viewport !== viewport
      ? initial
      : legacyDesktopDefaultOnMobile
        ? initial
        : (stored?.view ?? initial);
  return rememberedMapView;
}

function rememberMapView(view: ViewState) {
  rememberedMapView = clampViewToMap(view);
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    MAP_VIEW_STORAGE_KEY,
    JSON.stringify({ ...rememberedMapView, viewport: mapViewportKind() }),
  );
}

export function TransitMap() {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const mapContentRef = useRef<SVGGElement>(null);
  const flowContentRef = useRef<SVGGElement>(null);
  const baseContentRef = useRef<SVGGElement>(null);
  const blueprintRef = useRef<CityBlueprintHandle>(null);
  const [view] = useState<ViewState>(() => getRememberedMapView());
  // Smooth camera: input writes `targetRef`; a rAF loop eases `viewRef` (what is on
  // screen) towards it. Zoom eases in log-space around a fixed anchor so the point
  // under the cursor / pinch centre stays put for the whole animation.
  const viewRef = useRef(view);
  const targetRef = useRef(view);
  const zoomAnchor = useRef<{ ux: number; uy: number; wx: number; wy: number } | null>(null);
  const cameraResponse = useRef(CAMERA_RESPONSE_PAN);
  const cameraFrame = useRef<number | null>(null);
  const cameraLastT = useRef(0);
  const saveViewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Low-power tier: while the camera moves, the map layers are shifted with a CSS
  // transform (composited on the GPU) relative to the last committed view, and the
  // SVGs + street canvas are only re-rasterised when the camera settles or drifts far.
  const compositeCamera = useRef(false);
  const committedView = useRef(view);
  const cssOffset = useRef(false);
  // Layout box of the map SVGs and their viewBox "meet" mapping, captured untransformed.
  const meetBox = useRef({ left: 0, top: 0, s: 1, cx: 0, cy: 0 });

  const mapLayers = () => {
    const stage = svgRef.current;
    if (!stage) return [];
    const layers: (Element | null | undefined)[] = [
      stage.parentElement?.querySelector("canvas.city-blueprint"),
      baseContentRef.current?.ownerSVGElement,
      flowContentRef.current?.ownerSVGElement,
      stage,
    ];
    return layers.filter((el): el is SVGSVGElement | HTMLCanvasElement => !!el);
  };

  const measureMeet = useCallback(() => {
    const stage = svgRef.current;
    if (!stage || cssOffset.current) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const s = Math.min(rect.width / VIEWBOX.w, rect.height / VIEWBOX.h);
    meetBox.current = {
      left: rect.left,
      top: rect.top,
      s,
      cx: (rect.width - VIEWBOX.w * s) / 2 - s * VIEWBOX.x,
      cy: (rect.height - VIEWBOX.h * s) / 2 - s * VIEWBOX.y,
    };
  }, []);

  const commitView = useCallback((next: ViewState) => {
    // Pan/zoom changes a single SVG transform, not every station and label.
    const transform = `translate(${next.x * next.k} ${next.y * next.k}) scale(${next.k})`;
    mapContentRef.current?.setAttribute("transform", transform);
    flowContentRef.current?.setAttribute("transform", transform);
    baseContentRef.current?.setAttribute("transform", transform);
    blueprintRef.current?.draw(next);
    committedView.current = next;
    if (cssOffset.current) {
      for (const layer of mapLayers()) (layer as HTMLElement).style.transform = "";
      cssOffset.current = false;
    }
  }, []);

  const applyView = useCallback(
    (next: ViewState, settled = true) => {
      if (!compositeCamera.current || settled) {
        commitView(next);
      } else {
        const base = committedView.current;
        const r = next.k / base.k;
        const { s, cx, cy } = meetBox.current;
        const tx = cx * (1 - r) + s * next.k * (next.x - base.x);
        const ty = cy * (1 - r) + s * next.k * (next.y - base.y);
        const stage = svgRef.current;
        // Too far from the rasterised view: blank edges or blurry zoom would show.
        const drift =
          r < 0.7 ||
          r > 1.5 ||
          !stage ||
          Math.abs(tx) > stage.clientWidth * 0.3 ||
          Math.abs(ty) > stage.clientHeight * 0.3;
        if (drift) {
          commitView(next);
        } else {
          const css = `translate(${tx}px, ${ty}px) scale(${r})`;
          for (const layer of mapLayers()) (layer as HTMLElement).style.transform = css;
          cssOffset.current = true;
        }
      }
      if (saveViewTimer.current !== null) clearTimeout(saveViewTimer.current);
      saveViewTimer.current = setTimeout(() => rememberMapView(targetRef.current), 250);
    },
    [commitView],
  );

  const stepCamera = useCallback(
    (t: number) => {
      const dt = Math.min(0.064, Math.max(0, (t - cameraLastT.current) / 1000));
      cameraLastT.current = t;
      const cur = viewRef.current;
      const tgt = targetRef.current;
      const alpha = 1 - Math.exp(-dt * cameraResponse.current);

      const k = Math.exp(Math.log(cur.k) + (Math.log(tgt.k) - Math.log(cur.k)) * alpha);
      const anchor = zoomAnchor.current;
      const next = anchor
        ? clampViewToMap({ k, x: anchor.ux / k - anchor.wx, y: anchor.uy / k - anchor.wy })
        : { k, x: cur.x + (tgt.x - cur.x) * alpha, y: cur.y + (tgt.y - cur.y) * alpha };

      const settled =
        Math.abs(Math.log(tgt.k / next.k)) < 1e-4 &&
        Math.abs(tgt.x - next.x) * next.k < 0.02 &&
        Math.abs(tgt.y - next.y) * next.k < 0.02;

      viewRef.current = settled ? tgt : next;
      applyView(viewRef.current, settled && isPanning.current === false && activePointers.current.size === 0);

      if (settled) {
        cameraFrame.current = null;
        zoomAnchor.current = null;
      } else {
        cameraFrame.current = requestAnimationFrame(stepCamera);
      }
    },
    [applyView],
  );

  const setView = useCallback(
    (
      update: (previous: ViewState) => ViewState,
      response = CAMERA_RESPONSE_PAN,
      anchor: { ux: number; uy: number; wx: number; wy: number } | null = null,
    ) => {
      targetRef.current = update(targetRef.current);
      cameraResponse.current = response;
      zoomAnchor.current = anchor;
      if (cameraFrame.current !== null) return;
      cameraLastT.current = performance.now();
      cameraFrame.current = requestAnimationFrame(stepCamera);
    },
    [stepCamera],
  );
  // SSR renders the default view; the client may restore a different one from
  // sessionStorage, and React does not patch mismatched attributes on hydration.
  useLayoutEffect(() => {
    applyView(viewRef.current);
    measureMeet();
    // Low-power devices: freeze the flowing line gradients (they repaint every line each frame).
    if (isLitePerf()) {
      compositeCamera.current = true;
      flowContentRef.current?.ownerSVGElement
        ?.querySelectorAll("linearGradient animateTransform")
        .forEach((node) => node.remove());
    }
  }, [applyView, measureMeet]);
  useEffect(() => {
    window.addEventListener("resize", measureMeet);
    return () => {
      window.removeEventListener("resize", measureMeet);
      if (cameraFrame.current !== null) cancelAnimationFrame(cameraFrame.current);
      if (saveViewTimer.current !== null) clearTimeout(saveViewTimer.current);
      rememberMapView(targetRef.current);
    };
  }, [measureMeet]);
  // Which line is currently focused via the menu legend (hover). When set, every
  // other line / station / label on the map dims to FOCUS_DIM.
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null);
  const [preview, setPreviewState] = useState<PreviewState | null>(null);
  const [previewLeaving, setPreviewLeaving] = useState(false);
  const previewCardRef = useRef<HTMLDivElement>(null);
  const previewHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewUnmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearPreviewTimers = useCallback(() => {
    if (previewHideTimer.current !== null) clearTimeout(previewHideTimer.current);
    if (previewUnmountTimer.current !== null) clearTimeout(previewUnmountTimer.current);
    previewHideTimer.current = null;
    previewUnmountTimer.current = null;
  }, []);
  const showPreview = useCallback(
    (next: PreviewState) => {
      // The contact line opens the form directly; it has no preview card.
      if (isContactLine(next.lineId)) return;
      clearPreviewTimers();
      setPreviewLeaving(false);
      setPreviewState(next);
    },
    [clearPreviewTimers],
  );
  /** Fade the card out (after `delay`, so the pointer can travel onto it). */
  const hidePreview = useCallback((delay = 0) => {
    if (previewHideTimer.current !== null) clearTimeout(previewHideTimer.current);
    previewHideTimer.current = setTimeout(() => {
      previewHideTimer.current = null;
      setPreviewLeaving(true);
      previewUnmountTimer.current = setTimeout(() => {
        previewUnmountTimer.current = null;
        setPreviewState(null);
        setPreviewLeaving(false);
      }, 200);
    }, delay);
  }, []);
  const keepPreview = useCallback(() => {
    clearPreviewTimers();
    setPreviewLeaving(false);
  }, [clearPreviewTimers]);
  const setPreview = useCallback(
    (next: PreviewState | null) => (next ? showPreview(next) : hidePreview(0)),
    [showPreview, hidePreview],
  );
  /** Move a cursor-following card without re-rendering the map. */
  const movePreview = useCallback((x: number, y: number) => {
    const el = previewCardRef.current;
    if (!el) return;
    const pos = placePreview({ left: x, right: x, top: y, bottom: y }, el.offsetHeight || PREVIEW_EST_HEIGHT, 22);
    el.style.left = `${pos.left}px`;
    el.style.top = `${pos.top}px`;
  }, []);
  useEffect(() => clearPreviewTimers, [clearPreviewTimers]);
  const [contactOpen, setContactOpen] = useState(false);
  // Render light on the server, then adopt the visitor's stored choice/system preference on mount.
  const [theme, setTheme] = useState<MapTheme>("light");
  useEffect(() => setTheme(getStoredTheme()), []);
  const toggleTheme = useCallback(() => {
    withThemeFade(() =>
      flushSync(() =>
        setTheme((prev) => {
          const next: MapTheme = prev === "dark" ? "light" : "dark";
          setStoredTheme(next);
          return next;
        }),
      ),
    );
  }, []);
  // Deep-link: /?contact=1 abre o formulário de contato direto.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("contact")) setContactOpen(true);
  }, []);
  const isDimmed = useCallback(
    (ids: string[]) => hoveredLineId !== null && !ids.includes(hoveredLineId),
    [hoveredLineId],
  );
  // Server renders PT; the stored choice is applied after hydration (reading it
  // during the first render made SSR and client markup disagree).
  const [language, setLanguage] = useState<Language>("pt");
  useEffect(() => setLanguage(getStoredLanguage()), []);
  const skipFirstLanguageSave = useRef(true);
  useEffect(() => {
    if (skipFirstLanguageSave.current) {
      skipFirstLanguageSave.current = false;
      return;
    }
    setStoredLanguage(language);
    document.documentElement.lang = htmlLang(language);
  }, [language]);
  const showLinePreview = useCallback(
    (lineId: string, el: Element | null) => {
      if (!el || !getStationContent(lineId, language)) {
        setPreview(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setPreview({
        lineId,
        rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
      });
    },
    [language, setPreview],
  );

  const { go } = useRouteTransition();
  const warmStationRoute = useCallback(
    (slug: string | null) => {
      if (!slug) return;
      void router.preloadRoute({
        to: "/station/$stationId",
        params: { stationId: slug },
      });
    },
    [router],
  );

  useEffect(() => {
    warmStationRoute(stationSlugForLine("L1"));
  }, [warmStationRoute]);

  const resolveMapColor = useCallback((token: string) => {
    const mapRoot = svgRef.current?.closest<HTMLElement>("[data-map-theme]");
    if (!mapRoot) return "#dff7ff";
    return getComputedStyle(mapRoot).getPropertyValue(`--${token}`).trim() || "#dff7ff";
  }, []);
  const startStationTransition = useCallback(
    (slug: string | null, dissolveFrom?: DissolveOrigin) => {
      if (!slug) return;
      rememberMapView(targetRef.current);
      flushSync(() => setHoveredLineId(null));
      go({ to: "/station/$stationId", params: { stationId: slug }, dissolveFrom });
    },
    [go],
  );
  const openLineFromMap = useCallback(
    (line: Line, x: number, y: number) => {
      if (isContactLine(line.id)) {
        setContactOpen(true);
        return;
      }
      startStationTransition(stationSlugForLine(line.id), {
        x,
        y,
        color: resolveMapColor(lineVisualColor(line)),
      });
    },
    [resolveMapColor, startStationTransition],
  );
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("__dissolvePreview")) return;
    const timer = window.setTimeout(() => {
      startStationTransition(stationSlugForLine("L1"), {
        x: window.innerWidth * 0.22,
        y: window.innerHeight * 0.64,
        color: resolveMapColor("line-red"),
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [resolveMapColor, startStationTransition]);

  const lineById = useMemo(
    () => Object.fromEntries(allLines.map((l) => [l.id, l])) as Record<string, Line>,
    [],
  );
  const clientPointToMapPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const content = mapContentRef.current;
    const matrix = content?.getScreenCTM();
    if (!svg || !matrix) return null;

    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const mapped = point.matrixTransform(matrix.inverse());
    return { x: mapped.x, y: mapped.y };
  }, []);

  const openNearestLineAtPoint = useCallback(
    (clientX: number, clientY: number) => {
      const point = clientPointToMapPoint(clientX, clientY);
      const radiusPoint = clientPointToMapPoint(clientX + 34, clientY);
      if (!point || !radiusPoint) return false;

      const clickRadius = Math.max(
        12,
        Math.hypot(radiusPoint.x - point.x, radiusPoint.y - point.y),
      );
      let best: { line: Line; distance: number } | null = null;

      for (const segment of lineSegments) {
        if (!COLORED_LINE_IDS.has(segment.lineId)) continue;
        const line = lineById[segment.lineId];
        if (!line) continue;
        if (!stationSlugForLine(line.id) && !isContactLine(line.id)) continue;
        const distance = pointToSegmentDistance(point, segment);
        if (!best || distance < best.distance) best = { line, distance };
      }

      if (!best || best.distance > clickRadius + lineWidth(best.line) * 0.5) return false;
      openLineFromMap(best.line, clientX, clientY);
      return true;
    },
    [clientPointToMapPoint, lineById, openLineFromMap],
  );
  const subStations = useMemo(() => {
    const mainLineIds = new Set(["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9"]);
    const candidates: Array<{ id: string; lineId: string; x: number; y: number }> = [];

    for (const segment of lineSegments) {
      if (!mainLineIds.has(segment.lineId)) continue;
      const length = Math.hypot(segment.x2 - segment.x1, segment.y2 - segment.y1);
      const count = Math.max(0, Math.floor(length / 72) - 1);

      for (let index = 1; index <= count; index++) {
        const t = index / (count + 1);
        const point = {
          x: segment.x1 + (segment.x2 - segment.x1) * t,
          y: segment.y1 + (segment.y2 - segment.y1) * t,
        };
        const nearNamedStation = allStations.some(
          (station) => Math.hypot(station.x - point.x, station.y - point.y) < 34,
        );
        const nearAnotherRoute = lineSegments.some(
          (other) => other.lineId !== segment.lineId && pointToSegmentDistance(point, other) < 10,
        );
        const nearSubStation = candidates.some(
          (candidate) => Math.hypot(candidate.x - point.x, candidate.y - point.y) < 18,
        );
        if (nearNamedStation || nearAnotherRoute || nearSubStation) continue;

        candidates.push({
          id: `${segment.lineId}-${candidates.length}`,
          lineId: segment.lineId,
          x: point.x,
          y: point.y,
        });
      }
    }

    return candidates;
  }, []);
  const terminalPlacements = useMemo(() => {
    const placed = new Map<string, { cx: number; cy: number }>();
    const used: Box[] = [];

    for (const terminal of lineTerminals) {
      const line = lineById[terminal.lineId];
      if (!line) continue;
      const fs = TERMINAL_LINE_NAME_SIZE;
      const badge = TERMINAL_LINE_BADGE_SIZE;
      const gap = TERMINAL_LINE_BADGE_GAP;
      const text = (lineCopy[language][line.id] ?? line.name).toUpperCase();
      const metrics = terminalLabelMetrics(terminal, text, fs, badge, gap);
      let best = terminalLabelPlacement(terminal, metrics.width, metrics.height);
      for (const sideOffset of TERMINAL_SIDE_OFFSETS) {
        const candidate = terminalLabelPlacement(
          terminal,
          metrics.width,
          metrics.height,
          sideOffset,
        );
        const box = {
          x: candidate.cx - metrics.width / 2,
          y: candidate.cy - metrics.height / 2,
          w: metrics.width,
          h: metrics.height,
        };
        const softBox = terminalLabelBox(candidate, metrics.width, metrics.height);
        if (
          !used.some((other) => boxesOverlap(softBox, other, 0.8)) &&
          !lineSegments.some((segment) => segmentIntersectsBox(segment, box))
        ) {
          best = candidate;
          break;
        }
      }
      placed.set(terminal.id, best);
      used.push(terminalLabelBox(best, metrics.width, metrics.height));
    }

    return placed;
  }, [lineById, language]);
  const activeLines = useMemo(
    () => ACTIVE_LINE_IDS.map((id) => lineById[id]).filter(Boolean) as Line[],
    [lineById],
  );
  // Metro-style heading for each line's menu arrow: points toward the line's
  // farthest terminal from the map centre (so each chip's arrow aims at its line).
  const lineArrowAngle = useMemo(() => {
    const m: Record<string, number> = {};
    for (const id of ACTIVE_LINE_IDS) {
      const terms = lineTerminals.filter((t) => t.lineId === id);
      if (!terms.length) {
        m[id] = 0;
        continue;
      }
      const far = terms.reduce((a, b) => (Math.hypot(b.x, b.y) > Math.hypot(a.x, a.y) ? b : a));
      m[id] = (Math.atan2(far.y, far.x) * 180) / Math.PI;
    }
    return m;
  }, []);
  const routeObstacles = useMemo(() => makeLineObstacles(), []);

  // Lines serving each station, read straight from the station's own membership.
  const linesByStation = useMemo(() => {
    const map: Record<string, Line[]> = {};
    for (const s of allStations) {
      map[s.id] = (s.lines ?? []).map((id) => lineById[id]).filter(Boolean) as Line[];
    }
    return map;
  }, [lineById]);

  // Effective station kind. Interchange = explicit crossing marker or ≥2 lines.
  const stationKinds = useMemo(() => {
    const m = new Map<string, StationKind>();
    for (const s of allStations) {
      const ls = linesByStation[s.id] ?? [];
      const publicLineCount = ls.filter((line) => !line.noPage).length;
      if (s.kind === "major") m.set(s.id, "major");
      else if (s.kind === "interchange" || publicLineCount >= 2 || ls.length >= 2) {
        m.set(s.id, "interchange");
      } else if (s.kind === "terminal") m.set(s.id, "terminal");
      else m.set(s.id, "regular");
    }
    return m;
  }, [linesByStation]);

  // Collision-avoided label layout: every marker is an obstacle, every visible
  // name (with its badge block) is placed where it doesn't overlap anything.
  const placements = useMemo(() => {
    const markerBoxes: Box[] = [];
    const items: LabelItem[] = [];

    for (const terminal of lineTerminals) {
      const line = lineById[terminal.lineId];
      if (!line) continue;
      const fs = TERMINAL_LINE_NAME_SIZE;
      const badge = TERMINAL_LINE_BADGE_SIZE;
      const gap = TERMINAL_LINE_BADGE_GAP;
      const text = (lineCopy[language][line.id] ?? line.name).toUpperCase();
      const metrics = terminalLabelMetrics(terminal, text, fs, badge, gap);
      const center =
        terminalPlacements.get(terminal.id) ??
        terminalLabelPlacement(terminal, metrics.width, metrics.height);
      markerBoxes.push(terminalLabelBox(center, metrics.width, metrics.height));
    }

    // Route (line) labels go through the same collision system, so a crossing
    // line never runs through them either.
    for (const line of allLines) {
      if (!line.label) continue;
      const fs = 5.4;
      items.push({
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
      });
    }

    for (const s of allStations) {
      const kind = stationKinds.get(s.id) ?? "regular";
      const ls = linesByStation[s.id] ?? [];
      const secondaryOnly = ls.length > 0 && ls.every((l) => l.noPage);
      const { px, py } = perpDir(s.segAngle ?? 0, s.labelSide ?? 1);

      // marker obstacle (so no label ever sits on a marker)
      let mBox: Box;
      if (kind === "interchange" || kind === "terminal") {
        const hub = transferHubSize((s.lines ?? []).length);
        const pad = 3.2;
        // The capsule rotates with the line, so reserve its longest extent.
        const reach = Math.max(hub.len, hub.thick) / 2 + pad;
        mBox = {
          x: s.x - reach,
          y: s.y - reach,
          w: reach * 2,
          h: reach * 2,
        };
      } else if (kind === "major") {
        mBox = { x: s.x - 7.5, y: s.y - 7.5, w: 15, h: 15 };
      } else {
        mBox = { x: s.x - 3, y: s.y - 3, w: 6, h: 6 };
      }
      markerBoxes.push(mBox);

      // Secondary stops keep their dot but show no name.
      if (secondaryOnly) continue;

      let bw: number, bh: number, markerHalf: number, priority: number;
      if (kind === "interchange") {
        const fs = 6.4;
        const badgeGrid = interchangeBadgeMetrics(ls.length);
        bw = Math.max(estW(s.name, fs), badgeGrid.w);
        bh = fs * 1.2 + INTERCHANGE_NAME_GAP + badgeGrid.h;
        markerHalf = 10;
        priority = 0;
      } else if (kind === "terminal") {
        const fs = TERMINAL_STATION_NAME_SIZE;
        bw = Math.max(estW(s.name.toUpperCase(), fs), 7);
        bh = fs * 1.2;
        markerHalf = 10;
        priority = 1;
      } else if (kind === "major") {
        const fs = 4.9;
        bw = estW(s.name, fs);
        bh = fs * 1.2;
        markerHalf = 7.5;
        priority = 2;
      } else {
        const fs = 3.9;
        bw = estW(s.name, fs);
        bh = fs * 1.2;
        markerHalf = 3;
        priority = 3;
      }
      items.push({
        id: s.id,
        sx: s.x,
        sy: s.y,
        markerHalf,
        bw,
        bh,
        perpX: px,
        perpY: py,
        priority,
        obstacle: mBox,
        angles:
          kind !== "interchange"
            ? s.labelAngle !== undefined
              ? [s.labelAngle]
              : secondaryLabelAngles(s.segAngle ?? 0)
            : undefined,
      });
    }
    return layoutLabels(items, markerBoxes, routeObstacles);
  }, [stationKinds, linesByStation, routeObstacles, lineById, language, terminalPlacements]);

  // --- Smooth Pan / Zoom with Inertia (Momentum Physics) ---
  const isPanning = useRef(false);
  const moved = useRef(false);
  // Pan origin in client px plus the target view at pointer-down.
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchLast = useRef<{ dist: number; ux: number; uy: number } | null>(null);
  // SVG user units per client pixel (viewBox "meet" scale), refreshed on pointer-down.
  const userPerPx = useRef(1);

  // Velocity tracking & inertia momentum
  const pointerVelocity = useRef({ vx: 0, vy: 0, lastX: 0, lastY: 0, lastT: 0 });
  const inertiaAnimId = useRef<number | null>(null);

  const stopInertia = useCallback(() => {
    if (inertiaAnimId.current !== null) {
      cancelAnimationFrame(inertiaAnimId.current);
      inertiaAnimId.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopInertia();
  }, [stopInertia]);

  // Client px -> SVG user space (viewBox coords, before the content transform).
  // Uses the layout mapping, not getScreenCTM: the latter includes the temporary CSS
  // camera offset of the low-power tier.
  const clientToUser = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current) return null;
    measureMeet();
    const { left, top, s, cx, cy } = meetBox.current;
    return { x: (clientX - left - cx) / s, y: (clientY - top - cy) / s };
  }, [measureMeet]);

  const refreshUserPerPx = () => {
    measureMeet();
    if (meetBox.current.s > 0) userPerPx.current = 1 / meetBox.current.s;
  };

  const beginPan = (clientX: number, clientY: number) => {
    isPanning.current = true;
    panStart.current = {
      x: clientX,
      y: clientY,
      vx: targetRef.current.x,
      vy: targetRef.current.y,
    };
    pointerVelocity.current = {
      vx: 0,
      vy: 0,
      lastX: clientX,
      lastY: clientY,
      lastT: performance.now(),
    };
  };

  const beginPinch = () => {
    const pts = [...activePointers.current.values()];
    const mid = clientToUser((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    pinchLast.current = mid && dist > 0 ? { dist, ux: mid.x, uy: mid.y } : null;
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    stopInertia();
    refreshUserPerPx();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Pointer already released (or synthetic); panning still works without capture.
    }
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 1) {
      moved.current = false;
      pinchLast.current = null;
      beginPan(e.clientX, e.clientY);
    } else if (activePointers.current.size === 2) {
      isPanning.current = false;
      beginPinch();
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 2) {
      const last = pinchLast.current;
      const pts = [...activePointers.current.values()];
      const mid = clientToUser((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (last && mid && dist > 0) {
        moved.current = true;
        // Zoom around the previous pinch centre, then follow the centre as it moves.
        setView((v) => {
          const wx = last.ux / v.k - v.x;
          const wy = last.uy / v.k - v.y;
          const k = clamp(v.k * (dist / last.dist), MIN_ZOOM, MAX_ZOOM);
          return clampViewToMap({ k, x: mid.x / k - wx, y: mid.y / k - wy });
        }, CAMERA_RESPONSE_PINCH);
      }
      pinchLast.current = mid && dist > 0 ? { dist, ux: mid.x, uy: mid.y } : null;
      return;
    }

    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    if (!moved.current && Math.hypot(dx, dy) > 4) moved.current = true;

    // Track smoothed instantaneous velocity (client px / ms)
    const now = performance.now();
    const dt = now - pointerVelocity.current.lastT;
    if (dt > 8) {
      const instVx = (e.clientX - pointerVelocity.current.lastX) / dt;
      const instVy = (e.clientY - pointerVelocity.current.lastY) / dt;
      pointerVelocity.current.vx = pointerVelocity.current.vx * 0.35 + instVx * 0.65;
      pointerVelocity.current.vy = pointerVelocity.current.vy * 0.35 + instVy * 0.65;
      pointerVelocity.current.lastX = e.clientX;
      pointerVelocity.current.lastY = e.clientY;
      pointerVelocity.current.lastT = now;
    }

    const upp = userPerPx.current;
    setView((v) =>
      clampViewToMap({
        ...v,
        x: panStart.current.vx + (dx * upp) / v.k,
        y: panStart.current.vy + (dy * upp) / v.k,
      }),
    );
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    activePointers.current.delete(e.pointerId);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (activePointers.current.size < 2) {
      pinchLast.current = null;
    }
    if (activePointers.current.size === 0) {
      const wasPanning = isPanning.current;
      isPanning.current = false;

      // Trigger momentum fling if released with speed
      const now = performance.now();
      const timeSinceLastMove = now - pointerVelocity.current.lastT;
      if (wasPanning && moved.current && timeSinceLastMove < 75) {
        // Client px per 60 Hz frame; converted to user units when applied.
        let vx = pointerVelocity.current.vx * 16;
        let vy = pointerVelocity.current.vy * 16;
        const initialSpeed = Math.hypot(vx, vy);

        if (initialSpeed > 1.2) {
          const maxSpeed = 38;
          if (initialSpeed > maxSpeed) {
            const factor = maxSpeed / initialSpeed;
            vx *= factor;
            vy *= factor;
          }

          // Frame-rate independent decay: 0.935 per 60 Hz frame.
          const frameMs = 1000 / 60;
          const upp = userPerPx.current;
          let lastT = performance.now();
          const stepInertia = (t: number) => {
            const frames = Math.min(64, Math.max(0, t - lastT)) / frameMs;
            lastT = t;
            const decay = Math.pow(0.935, frames);
            vx *= decay;
            vy *= decay;

            if (Math.hypot(vx, vy) < 0.15) {
              inertiaAnimId.current = null;
              return;
            }

            setView((v) => {
              const next = clampViewToMap({
                ...v,
                x: v.x + (vx * frames * upp) / v.k,
                y: v.y + (vy * frames * upp) / v.k,
              });
              if (next.x === v.x) vx *= 0.5;
              if (next.y === v.y) vy *= 0.5;
              return next;
            });

            inertiaAnimId.current = requestAnimationFrame(stepInertia);
          };

          inertiaAnimId.current = requestAnimationFrame(stepInertia);
        }
      }
      // Camera already at rest under the finger: rasterise the final view now.
      if (inertiaAnimId.current === null && cameraFrame.current === null && cssOffset.current) {
        commitView(viewRef.current);
      }
    } else if (activePointers.current.size === 1) {
      // One finger remains after pinch — resume pan from current position
      const [remaining] = activePointers.current.values();
      beginPan(remaining.x, remaining.y);
    }
  };

  const onWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      stopInertia();
      const u = clientToUser(e.clientX, e.clientY);
      if (!u) return;

      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 16;
      else if (e.deltaMode === 2) delta *= window.innerHeight;
      // Trackpad pinch arrives as ctrl+wheel with small deltas.
      const speed = e.ctrlKey ? PINCH_WHEEL_ZOOM_SPEED : WHEEL_ZOOM_SPEED;
      const factor = Math.exp(-clamp(delta, -300, 300) * speed);

      // Anchor on the map point currently under the cursor (what is on screen now),
      // so the zoom animation converges on it even while a previous zoom is easing.
      const cur = viewRef.current;
      const wx = u.x / cur.k - cur.x;
      const wy = u.y / cur.k - cur.y;
      setView(
        (v) => {
          const k = clamp(v.k * factor, MIN_ZOOM, MAX_ZOOM);
          return clampViewToMap({ k, x: u.x / k - wx, y: u.y / k - wy });
        },
        e.ctrlKey ? CAMERA_RESPONSE_PINCH : CAMERA_RESPONSE_ZOOM,
        { ux: u.x, uy: u.y, wx, wy },
      );
    },
    [clientToUser, setView, stopInertia],
  );
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  const onMapClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (moved.current) return;
      openNearestLineAtPoint(event.clientX, event.clientY);
    },
    [openNearestLineAtPoint],
  );

  return (
    <div
      role="main"
      aria-label={language === "en" ? "Metro network portfolio" : "Malha metroviária, portfólio"}
      data-map-theme={themeAttrs(theme).mapTheme}
      data-map-aesthetic={themeAttrs(theme).aesthetic}
      data-transition-surface="map"
      className="map-dot-grid relative h-screen w-screen overflow-hidden font-sans"
      suppressHydrationWarning
    >
      <a className="sr-only" href="#projects">
        {language === "en" ? "Skip to the project list" : "Ir para a lista de projetos"}
      </a>

      <MeshGradient theme={themeAttrs(theme).mapTheme} />
      <div className="map-aurora" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>

      <header
        className="map-title"
        aria-label={language === "en" ? "Page title" : "Título da página"}
      >
        <h1 className="map-title-primary">
          {language === "en" ? "Mateus' portfolio 𖹭" : "Portfólio do Mateus 𖹭"}
        </h1>
        <p className="map-title-secondary">
          {language === "en" ? "Multidisciplinary product designer" : "Product designer multidisciplinar"}
        </p>
      </header>

      <p className="sr-only">
        {language === "en"
          ? "Interactive metro-map of my portfolio. Each line is a project; use the project list below to open one."
          : "Mapa interativo do meu portfólio em forma de malha metroviária. Cada linha é um projeto; use a lista de projetos abaixo para abrir um."}
      </p>


      <CityBlueprint
        ref={blueprintRef}
        viewBox={VIEWBOX}
        theme={themeAttrs(theme).mapTheme}
        initialView={view}
      />

      {/* Static base layer: neon halos and line casings, under the animated lines. */}
      <svg
        className="map-stage-base"
        aria-hidden="true"
        focusable="false"
        viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 2, pointerEvents: "none" }}
      >
        <g
          ref={baseContentRef}
          suppressHydrationWarning
          transform={`translate(${view.x * view.k} ${view.y * view.k}) scale(${view.k})`}
        >
          {/* Luminous Neon Radiance for Colored Metro Lines */}
          <g className="map-network-radiance" aria-hidden="true" pointerEvents="none" fill="none">
            {allLines
              .filter((line) => COLORED_LINE_IDS.has(line.id))
              .map((line) => (
                <g
                  key={`radiance-${line.id}`}
                  stroke={`var(--${line.color})`}
                  opacity={isDimmed([line.id]) ? 0.04 : 1}
                >
                  <path className="map-radiance-outer" d={line.pathD} />
                  <path className="map-radiance-mid" d={line.pathD} />
                  <path className="map-radiance-inner" d={line.pathD} />
                </g>
              ))}
          </g>


        </g>
      </svg>

      {/* Animated layer (flowing line gradients, glass core, trains, packets). Kept in its
          own SVG so its per-frame repaints never re-rasterize the static map above
          (stations, labels, hit areas), which only repaints when the camera moves. */}
      <svg
        className="map-stage-flow"
        aria-hidden="true"
        focusable="false"
        viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 2, pointerEvents: "none" }}
      >
        <defs>
          {allLines
            .filter((l) => COLORED_LINE_IDS.has(l.id))
            .map((line) => (
              <linearGradient
                key={`grad-${line.id}`}
                id={`grad-${line.id}`}
                x1="0%"
                y1="0%"
                x2="35%"
                y2="35%"
                spreadMethod="reflect"
              >
                <stop offset="0%" stopColor={`var(--${line.color})`} />
                <stop
                  offset="45%"
                  stopColor={`color-mix(in srgb, var(--${line.color}) 45%, white)`}
                />
                <stop offset="55%" stopColor={`var(--${line.color})`} />
                <stop
                  offset="100%"
                  stopColor={`color-mix(in srgb, var(--${line.color}) 78%, #040608)`}
                />
                {/* Light flowing along the line: shift by one reflect period (2 x 35%) so it loops seamlessly. */}
                <animateTransform
                  attributeName="gradientTransform"
                  type="translate"
                  from="0 0"
                  to="0.7 0.7"
                  dur="5s"
                  repeatCount="indefinite"
                />
              </linearGradient>
            ))}
        </defs>

        <g
          ref={flowContentRef}
          suppressHydrationWarning
          transform={`translate(${view.x * view.k} ${view.y * view.k}) scale(${view.k})`}
        >
          {/* Lines */}
          <g aria-label="lines">
            {allLines.map((line) => {
              const w = lineWidth(line);
              const common = {
                d: line.pathD,
                fill: "none",
                strokeLinecap: "round" as const,
                strokeLinejoin: "round" as const,
              };
              const focused = hoveredLineId === line.id;
              // Each line draws its own dark casing right under itself, so a line
              // crossing over another visibly cuts it (classic metro-map crossing).
              const casing = (
                <path
                  d={line.pathD}
                  fill="none"
                  stroke="var(--map-bg)"
                  strokeWidth={w + (line.noPage ? 1.6 : 2.4)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
              if (line.kind === "brt" || line.kind === "light-rail") {
                return (
                  <g
                    key={`line-${line.id}`}
                    className="map-focusable"
                    opacity={isDimmed([line.id]) ? FOCUS_DIM : 1}
                  >
                    {casing}
                    <path
                      {...common}
                      className={line.noPage ? "support-route-line" : "active-route-line"}
                      stroke={
                        COLORED_LINE_IDS.has(line.id)
                          ? `url(#grad-${line.id})`
                          : `var(--${lineVisualColor(line)})`
                      }
                      strokeWidth={w}
                    />
                    <path
                      {...common}
                      className="route-line-cutout"
                      stroke="var(--map-bg)"
                      strokeWidth={
                        line.kind === "brt" ? Math.max(1.2, w - 2.2) : Math.max(1, w - 1.4)
                      }
                    />
                  </g>
                );
              }
              return (
                <g key={`line-${line.id}`} opacity={isDimmed([line.id]) ? FOCUS_DIM : 1}>
                {casing}
                <path
                  {...common}
                  className={`${line.noPage ? "support-route-line" : "active-route-line"} map-focusable`}
                  stroke={
                    COLORED_LINE_IDS.has(line.id)
                      ? `url(#grad-${line.id})`
                      : `var(--${lineVisualColor(line)})`
                  }
                  strokeWidth={w + (focused ? 1.4 : 0)}
                  strokeDasharray={lineDash(line)}
                  strokeOpacity={line.kind === "commuter" ? 0.58 : 1}
                />
                </g>
              );
            })}
          </g>

          {/* Glass tube highlight: thin specular core along each metro line. */}
          <g className="map-line-gloss" aria-hidden="true" pointerEvents="none" fill="none">
            {allLines
              .filter((line) => line.kind === "metro")
              .map((line) => (
                <path
                  key={`gloss-${line.id}`}
                  d={line.pathD}
                  strokeWidth={Math.max(0.6, lineWidth(line) * 0.24)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={lineDash(line)}
                  opacity={isDimmed([line.id]) ? 0 : 1}
                />
              ))}
          </g>

          <MovingTrains lines={allLines} colorForLine={lineVisualColor} />
        </g>
      </svg>

      <svg
        ref={svgRef}
        aria-hidden="true"
        focusable="false"
        className="map-stage relative z-[2] h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
        viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onMapClick}
      >

        <g
          ref={mapContentRef}
          // Client may restore a different view from sessionStorage; applied on mount.
          suppressHydrationWarning
          transform={`translate(${view.x * view.k} ${view.y * view.k}) scale(${view.k})`}
        >
          <g aria-label="line-hit-areas">
            {allLines.map((line) => {
              const slug = stationSlugForLine(line.id);
              const interactive = !!slug || isContactLine(line.id);
              if (!interactive) return null;
              const label = lineCopy[language][line.id] ?? line.name;
              return (
                <path
                  key={`line-hit-${line.id}`}
                  d={line.pathD}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.001)"
                  strokeWidth={26}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="stroke"
                  role={isContactLine(line.id) ? "button" : "link"}
                  tabIndex={0}
                  aria-label={
                    isContactLine(line.id)
                      ? language === "en"
                        ? "Open contact form"
                        : "Abrir formulário de contato"
                      : language === "en"
                        ? `Open ${label} station`
                        : `Abrir estação ${label}`
                  }
                  className="map-line-hit-area"
                  style={{ cursor: "pointer" }}
                  onMouseEnter={(event) => {
                    setHoveredLineId(line.id);
                    warmStationRoute(slug);
                    if (isPanning.current || !getStationContent(line.id, language)) return;
                    const { clientX: x, clientY: y } = event;
                    showPreview({ lineId: line.id, rect: { left: x, right: x, top: y, bottom: y }, follow: true });
                  }}
                  onMouseMove={(event) => {
                    if (isPanning.current) return;
                    movePreview(event.clientX, event.clientY);
                  }}
                  onMouseLeave={() => {
                    setHoveredLineId(null);
                    hidePreview(0);
                  }}
                  onFocus={() => {
                    setHoveredLineId(line.id);
                    warmStationRoute(slug);
                  }}
                  onBlur={() => setHoveredLineId(null)}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (moved.current) return;
                    openLineFromMap(line, event.clientX, event.clientY);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    const rect = event.currentTarget.getBoundingClientRect();
                    openLineFromMap(line, rect.left + rect.width / 2, rect.top + rect.height / 2);
                  }}
                />
              );
            })}
          </g>

          <g aria-label="sub-stations" pointerEvents="none">
            {subStations.map((station) => {
              const line = lineById[station.lineId];
              if (!line) return null;
              return (
                <rect
                  key={station.id}
                  className="sub-station-marker map-focusable"
                  x={station.x - 1.75}
                  y={station.y - 1.75}
                  width={3.5}
                  height={3.5}
                  fill="var(--map-station-fill)"
                  stroke={`var(--${lineVisualColor(line)})`}
                  strokeWidth={0.8}
                  vectorEffect="non-scaling-stroke"
                  opacity={isDimmed([station.lineId]) ? FOCUS_DIM : 0.94}
                />
              );
            })}
          </g>

          <g
            aria-label="line-labels"
            style={{
              pointerEvents: "none",
            }}
          >
            {allLines
              .filter((line) => line.label)
              .map((line) => {
                const pl = placements.get(`route-${line.id}`);
                if (!pl) return null;
                return (
                  <text
                    key={`route-label-${line.id}`}
                    className="map-focusable"
                    x={pl.cx}
                    y={pl.cy}
                    fontSize={5.4}
                    fontFamily="var(--font-sans)"
                    fontWeight={650}
                    fill={`var(--${lineVisualColor(line)})`}
                    textAnchor="middle"
                    dominantBaseline="central"
                    opacity={isDimmed([line.id]) ? FOCUS_DIM : 1}
                    transform={
                      line.label?.angle
                        ? `rotate(${line.label.angle} ${pl.cx} ${pl.cy})`
                        : undefined
                    }
                    style={{
                      paintOrder: "stroke",
                      stroke: "var(--map-bg)",
                      strokeWidth: 2.2,
                      strokeLinejoin: "round",
                    }}
                  >
                    {line.label!.text}
                  </text>
                );
              })}
          </g>

          <g
            aria-label="terminal-line-labels"
            style={{
              pointerEvents: "none",
            }}
          >
            {lineTerminals.map((terminal) => {
              const line = lineById[terminal.lineId];
              if (!line) return null;
              if (!COLORED_LINE_IDS.has(line.id)) return null;
              const text = (lineCopy[language][line.id] ?? line.name).toUpperCase();
              const fs = TERMINAL_LINE_NAME_SIZE;
              const scale = badgeScale(line);
              const badge = TERMINAL_LINE_BADGE_SIZE * scale;
              const numberFs = TERMINAL_LINE_NUMBER_SIZE * scale;
              const gap = TERMINAL_LINE_BADGE_GAP;
              const badgeAppearance = terminalBadgeAppearance(line);
              const metrics = terminalLabelMetrics(terminal, text, fs, badge, gap);
              const total = metrics.width;
              const reversed = terminalLabelReversed(terminal);
              const badgeX = reversed ? total / 2 - badge : -total / 2;
              const textX = reversed ? badgeX - gap : badgeX + badge + gap;
              const pl =
                terminalPlacements.get(terminal.id) ??
                terminalLabelPlacement(terminal, metrics.width, metrics.height);

              if (metrics.vertical) {
                const textH = fs * 1.1;
                const badgeY =
                  terminal.dirY >= 0 ? -metrics.height / 2 : metrics.height / 2 - badge;
                const textY =
                  terminal.dirY >= 0 ? badgeY + badge + gap + textH / 2 : badgeY - gap - textH / 2;
                return (
                  <g
                    key={`terminal-${terminal.id}`}
                    className="map-focusable"
                    transform={`translate(${pl.cx} ${pl.cy})`}
                    opacity={isDimmed([terminal.lineId]) ? FOCUS_DIM : 1}
                  >
                    <rect
                      x={-badge / 2}
                      y={badgeY}
                      width={badge}
                      height={badge}
                      fill={badgeAppearance.fill}
                      stroke={badgeAppearance.stroke}
                      strokeWidth={1}
                    />
                    <text
                      x={0}
                      y={badgeY + badge / 2}
                      fontSize={numberFs}
                      fontFamily="var(--font-sans)"
                      fontWeight={850}
                      fill={badgeAppearance.text}
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {lineNumber(line.shortName)}
                    </text>
                    <text
                      x={0}
                      y={textY}
                      fontSize={fs}
                      fontFamily="var(--font-sans)"
                      fontWeight={850}
                      fill="var(--map-terminal-label)"
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{
                        paintOrder: "stroke",
                        stroke: "var(--map-bg)",
                        strokeWidth: 2.8,
                        strokeLinejoin: "round",
                      }}
                    >
                      {text}
                    </text>
                  </g>
                );
              }

              return (
                <g
                  key={`terminal-${terminal.id}`}
                  className="map-focusable"
                  transform={`translate(${pl.cx} ${pl.cy})`}
                  opacity={isDimmed([terminal.lineId]) ? FOCUS_DIM : 1}
                >
                  <rect
                    x={badgeX}
                    y={-badge / 2}
                    width={badge}
                    height={badge}
                    fill={badgeAppearance.fill}
                    stroke={badgeAppearance.stroke}
                    strokeWidth={1}
                  />
                  <text
                    x={badgeX + badge / 2}
                    y={0}
                    fontSize={numberFs}
                    fontFamily="var(--font-sans)"
                    fontWeight={850}
                    fill={badgeAppearance.text}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {lineNumber(line.shortName)}
                  </text>
                  <text
                    x={textX}
                    y={0}
                    fontSize={fs}
                    fontFamily="var(--font-sans)"
                    fontWeight={850}
                    fill="var(--map-terminal-label)"
                    textAnchor={reversed ? "end" : "start"}
                    dominantBaseline="central"
                    style={{
                      paintOrder: "stroke",
                      stroke: "var(--map-bg)",
                      strokeWidth: 2.8,
                      strokeLinejoin: "round",
                    }}
                  >
                    {text}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Station markers (names placed separately, below).
              Public stations are clickable → open the station view. */}
          <g aria-label="stations">
            {allStations.map((s) => {
              const kind = stationKinds.get(s.id) ?? "regular";
              const serving = linesByStation[s.id] ?? [];
              const markerLine = serving.find((l) => !l.noPage) ?? serving[0];
              const stationSlug = stationSlugForLines(s.lines ?? []);
              const interactive = !!stationSlug;
              const transitionColor = markerLine
                ? resolveMapColor(lineVisualColor(markerLine))
                : "#dff7ff";
              const hit = interactive
                ? {
                    onClick: (event: React.MouseEvent<SVGGElement>) => {
                      event.stopPropagation();
                      if (!moved.current) {
                        startStationTransition(stationSlug, {
                          x: event.clientX,
                          y: event.clientY,
                          color: transitionColor,
                        });
                      }
                    },
                    onPointerEnter: (event: React.PointerEvent<SVGGElement>) => {
                      const lineId = (s.lines ?? []).find((id) =>
                        getStationContent(id, language),
                      );
                      if (lineId) showLinePreview(lineId, event.currentTarget);
                    },
                    onPointerLeave: () => setPreview(null),
                    style: { cursor: "pointer" as const },
                  }
                : { style: { pointerEvents: "none" as const } };

              let marker: React.ReactNode;
              if (kind === "interchange" || kind === "terminal") {
                const cols: string[] =
                  (s.lines ?? [])
                    .map((id) => lineById[id])
                    .filter((line): line is Line => Boolean(line))
                    .map(lineVisualColor)
                    .filter((color): color is string => Boolean(color)) ?? [];
                if (!cols.length && markerLine) cols.push(lineVisualColor(markerLine));
                const hub = transferHubSize(cols.length);
                const dots = transferHubDotPositions(cols.length);
                // Rotate the whole capsule to lie along the line so each dot is
                // centred on the stroke, exactly like the One Metro World legend.
                marker = (
                  <g transform={`rotate(${s.segAngle ?? 0} ${s.x} ${s.y})`}>
                    <rect
                      key="hub-shell"
                      x={s.x - hub.len / 2}
                      y={s.y - hub.thick / 2}
                      width={hub.len}
                      height={hub.thick}
                      fill="var(--map-station-fill)"
                      stroke="var(--map-ink)"
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                    />
                    {cols.map((c, i) => (
                      <rect
                        key={i}
                        x={s.x + (dots[i]?.along ?? 0) - 2.5}
                        y={s.y - 2.5}
                        width={5}
                        height={5}
                        fill={`var(--${c})`}
                      />
                    ))}
                  </g>
                );
              } else if (kind === "major") {
                marker = (
                  <g>
                    <rect
                      x={s.x - 6.4}
                      y={s.y - 6.4}
                      width={12.8}
                      height={12.8}
                      fill="var(--map-station-fill)"
                      stroke="var(--map-ink)"
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                    />
                    <rect x={s.x - 2.2} y={s.y - 2.2} width={4.4} height={4.4} fill="var(--map-ink)" />
                  </g>
                );
              } else if (markerLine?.noPage) {
                const color = `var(--${lineVisualColor(markerLine)})`;
                if (markerLine.kind === "bus" || markerLine.kind === "brt") {
                  marker = (
                    <rect
                      x={s.x - 2.4}
                      y={s.y - 2.4}
                      width={4.8}
                      height={4.8}
                      fill="var(--map-bg)"
                      stroke={color}
                      strokeWidth={0.8}
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                } else if (markerLine.kind === "ferry") {
                  const fd = 2.8;
                  marker = (
                    <polygon
                      points={`${s.x},${s.y - fd} ${s.x + fd},${s.y} ${s.x},${s.y + fd} ${s.x - fd},${s.y}`}
                      fill={color}
                    />
                  );
                } else if (markerLine.kind === "cable-car") {
                  marker = <rect x={s.x - 1.9} y={s.y - 1.9} width={3.8} height={3.8} fill={color} />;
                } else if (markerLine.kind === "commuter") {
                  marker = (
                    <g>
                      <rect x={s.x - 2.8} y={s.y - 2.8} width={5.6} height={5.6} fill={color} />
                      <rect x={s.x - 1} y={s.y - 1} width={2} height={2} fill="var(--map-bg)" />
                    </g>
                  );
                } else {
                  marker = (
                    <rect
                      x={s.x - 2.4}
                      y={s.y - 2.4}
                      width={4.8}
                      height={4.8}
                      fill="var(--map-bg)"
                      stroke={color}
                      strokeWidth={0.8}
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                }
              } else {
                marker = (
                  <rect
                    x={s.x - 2.3}
                    y={s.y - 2.3}
                    width={4.6}
                    height={4.6}
                    fill="var(--map-station-fill)"
                    stroke="var(--map-dot-ring)"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              }

              return (
                <g
                  key={s.id}
                  {...hit}
                  className="map-focusable"
                  opacity={isDimmed(s.lines ?? []) ? FOCUS_DIM : 1}
                >
                  {marker}
                  {interactive && (
                    <>
                      <rect
                        className="map-station-pulse"
                        x={s.x - (kind === "interchange" || kind === "terminal" ? 14 : 9)}
                        y={s.y - (kind === "interchange" || kind === "terminal" ? 14 : 9)}
                        width={(kind === "interchange" || kind === "terminal" ? 14 : 9) * 2}
                        height={(kind === "interchange" || kind === "terminal" ? 14 : 9) * 2}
                        fill="none"
                        stroke={transitionColor}
                        strokeWidth={1.2}
                        vectorEffect="non-scaling-stroke"
                      />
                      <rect
                        x={s.x - (kind === "interchange" || kind === "terminal" ? 16 : 10)}
                        y={s.y - (kind === "interchange" || kind === "terminal" ? 16 : 10)}
                        width={(kind === "interchange" || kind === "terminal" ? 16 : 10) * 2}
                        height={(kind === "interchange" || kind === "terminal" ? 16 : 10) * 2}
                        fill="transparent"
                        style={{ pointerEvents: "all" }}
                      />
                    </>
                  )}
                </g>
              );
            })}
          </g>

          {/* Labels — collision-avoided. Station names only; line numbers stay on terminals. */}
          <g
            aria-label="labels"
            style={{
              pointerEvents: "none",
            }}
          >
            {allStations.map((s) => {
              const pl = placements.get(s.id);
              if (!pl) return null;
              const kind = stationKinds.get(s.id) ?? "regular";

              if (kind === "interchange") {
                const serving = linesByStation[s.id] ?? [];
                const fs = 6.4;
                const nameHeight = fs * 1.2;
                const badgeGrid = interchangeBadgeMetrics(serving.length);
                const totalHeight = nameHeight + INTERCHANGE_NAME_GAP + badgeGrid.h;
                const nameY = pl.cy - totalHeight / 2 + nameHeight / 2;
                const badgesTop = nameY + nameHeight / 2 + INTERCHANGE_NAME_GAP;
                return (
                  <g
                    key={`l-${s.id}`}
                    className="map-focusable"
                    opacity={isDimmed(s.lines ?? []) ? FOCUS_DIM : 1}
                  >
                    <text
                      x={pl.cx}
                      y={nameY}
                      fontSize={fs}
                      fontFamily="var(--font-sans)"
                      fontWeight={650}
                      fill="var(--map-terminal-label)"
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{
                        paintOrder: "stroke",
                        stroke: "var(--map-bg)",
                        strokeWidth: 3.1,
                        strokeLinejoin: "round",
                      }}
                    >
                      {s.name}
                    </text>
                    {serving.map((line, index) => {
                      const row = Math.floor(index / badgeGrid.cols);
                      const col = index % badgeGrid.cols;
                      const rowCount =
                        row === badgeGrid.rows - 1
                          ? badgeGrid.count - row * badgeGrid.cols
                          : badgeGrid.cols;
                      const rowWidth =
                        rowCount * INTERCHANGE_BADGE_SIZE + (rowCount - 1) * INTERCHANGE_BADGE_GAP;
                      const x =
                        pl.cx -
                        rowWidth / 2 +
                        col * (INTERCHANGE_BADGE_SIZE + INTERCHANGE_BADGE_GAP);
                      const y = badgesTop + row * (INTERCHANGE_BADGE_SIZE + INTERCHANGE_BADGE_GAP);

                      return (
                        <g
                          key={`${s.id}-${line.id}`}
                          className="interchange-line-badge"
                          transform={`translate(${x} ${y})`}
                        >
                          <rect
                            width={INTERCHANGE_BADGE_SIZE}
                            height={INTERCHANGE_BADGE_SIZE}
                            fill={lineBadgeFill(line)}
                            stroke="var(--map-bg)"
                            strokeWidth={0.9}
                          />
                          <text
                            x={INTERCHANGE_BADGE_SIZE / 2}
                            y={INTERCHANGE_BADGE_SIZE / 2}
                            fontSize={10.5}
                            fontFamily="var(--font-sans)"
                            fontWeight={850}
                            fill={lineBadgeTextFill()}
                            textAnchor="middle"
                            dominantBaseline="central"
                            style={{
                              paintOrder: "stroke",
                              stroke: "rgba(0, 0, 0, 0.18)",
                              strokeWidth: 0.7,
                            }}
                          >
                            {lineNumber(line.shortName)}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              }

              if (kind === "terminal") {
                return (
                  <text
                    key={`l-${s.id}`}
                    className="map-focusable"
                    x={pl.cx}
                    y={pl.cy}
                    fontSize={TERMINAL_STATION_NAME_SIZE}
                    fontFamily="var(--font-sans)"
                    fontWeight={760}
                    fill="var(--map-terminal-label)"
                    textAnchor="middle"
                    dominantBaseline="central"
                    opacity={isDimmed(s.lines ?? []) ? FOCUS_DIM : 0.58}
                    transform={pl.angle ? `rotate(${pl.angle} ${pl.cx} ${pl.cy})` : undefined}
                    style={{
                      paintOrder: "stroke",
                      stroke: "var(--map-bg)",
                      strokeWidth: 3.1,
                      strokeLinejoin: "round",
                    }}
                  >
                    {s.name.toUpperCase()}
                  </text>
                );
              }

              const isMajor = kind === "major";
              const fs = isMajor ? 4.9 : 3.9;
              return (
                <text
                  key={`l-${s.id}`}
                  className="map-focusable"
                  x={pl.cx}
                  y={pl.cy}
                  fontSize={fs}
                  fontFamily="var(--font-sans)"
                  fontWeight={isMajor ? 650 : 500}
                  fill="var(--map-station-label)"
                  textAnchor="middle"
                  dominantBaseline="central"
                  opacity={isDimmed(s.lines ?? []) ? FOCUS_DIM : isMajor ? 0.56 : 0.44}
                  transform={pl.angle ? `rotate(${pl.angle} ${pl.cx} ${pl.cy})` : undefined}
                  style={{
                    paintOrder: "stroke",
                    stroke: "var(--map-bg)",
                    strokeWidth: 1.8,
                    strokeLinejoin: "round",
                  }}
                >
                  {s.name}
                </text>
              );
            })}
          </g>
        </g>
      </svg>

      <div className="map-film pointer-events-none" aria-hidden="true" />

      <nav
        id="projects"
        tabIndex={-1}
        aria-label={language === "en" ? "Portfolio projects" : "Projetos do portfólio"}
        className="map-legend pointer-events-auto flex flex-col items-start gap-[3px]"
        onMouseLeave={() => {
          setHoveredLineId(null);
          hidePreview(160);
        }}
      >
        <div className="map-menu-controls">
          <div
            className="map-language-tabs"
            data-tip={language === "en" ? "Text language." : "Idioma do texto."}
          >
            {LANGUAGES.map((item) => {
              const active = language === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLanguage(item.id)}
                  aria-pressed={active}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="map-theme-toggle"
            onClick={toggleTheme}
            aria-pressed={theme === "light"}
            data-tip={language === "en" ? "Light or dark mode." : "Modo claro ou escuro."}
            aria-label={
              theme === "dark"
                ? language === "en"
                  ? "Switch to light mode"
                  : "Mudar para o modo claro"
                : language === "en"
                  ? "Switch to dark mode"
                  : "Mudar para o modo escuro"
            }
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          <Link
            to="/leitura"
            className="map-reading-btn"
            data-tip={
              language === "en"
                ? "Reading mode: accessible text version."
                : "Modo leitura: versão em texto, acessível."
            }
            aria-label={language === "en" ? "Reading mode" : "Modo leitura"}
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <ul className="map-line-list">
          {activeLines.map((line) => {
            const slug = stationSlugForLine(line.id);
            const focused = hoveredLineId === line.id;
            const dimmed = hoveredLineId !== null && !focused;
            const subtitle = LINE_SUBTITLES[line.id]?.[language];
            // Screen-reader name: number, title and client/company (the visual
            // card is mouse-only, so fold that info into the button's label).
            const previewData = getLinePreview(line.id, language);
            const accessibleName = [
              `${lineNumber(line.shortName)}.`,
              lineCopy[language][line.id] ?? line.name,
              previewData?.client,
              previewData?.company ?? previewData?.role,
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <li key={line.id} className="w-full">
                <button
                  type="button"
                  aria-label={accessibleName}
                  onMouseEnter={(event) => {
                    setHoveredLineId(line.id);
                    warmStationRoute(slug);
                    showLinePreview(line.id, event.currentTarget);
                  }}
                  onMouseLeave={() => {
                    setHoveredLineId(null);
                    hidePreview(160);
                  }}
                  onFocus={(event) => {
                    setHoveredLineId(line.id);
                    warmStationRoute(slug);
                    showLinePreview(line.id, event.currentTarget);
                  }}
                  onBlur={() => {
                    setHoveredLineId(null);
                    hidePreview(160);
                  }}
                  onClick={(event) => {
                    if (isContactLine(line.id)) {
                      setContactOpen(true);
                      return;
                    }
                    const rect = event.currentTarget.getBoundingClientRect();
                    startStationTransition(slug, {
                      x: rect.left + rect.width / 2,
                      y: rect.top + rect.height / 2,
                      color: resolveMapColor(lineVisualColor(line)),
                    });
                  }}
                  className={`map-line-card${focused ? " is-focused" : ""}`}
                  style={
                    {
                      "--menu-line": `var(--${lineVisualColor(line)})`,
                      opacity: dimmed ? 0.35 : 1,
                    } as CSSProperties
                  }
                >
                  <span
                    className={`map-line-badge${COLORED_LINE_IDS.has(line.id) ? "" : " is-grey"}`}
                    style={{ background: `var(--${lineVisualColor(line)})` }}
                  >
                    {lineNumber(line.shortName)}
                  </span>
                  <div className="map-line-text">
                    <span className="map-line-title">{lineCopy[language][line.id] ?? line.name}</span>
                    {WAVEFORM_SUBTITLE_LINE_IDS.has(line.id) ? (
                      <span className="map-line-subtitle map-line-subtitle--wave">
                        <MenuWaveform />
                      </span>
                    ) : subtitle ? (
                      <span className="map-line-subtitle">{subtitle}</span>
                    ) : null}
                  </div>
                  <svg
                    className="map-line-arrow-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    strokeLinecap="butt"
                    strokeLinejoin="miter"
                    aria-hidden="true"
                  >
                    {/* NYC-style pointy arrow, aimed at the line's own direction. */}
                    <g transform={`rotate(${Math.round((lineArrowAngle[line.id] ?? 0) / 45) * 45} 12 12)`}>
                      <path d="M4 12h15M13 6l6 6-6 6" />
                    </g>
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <ContactModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        language={language}
        accent={resolveMapColor(lineVisualColor(lineById["L8"] ?? activeLines[0]))}
      />

      <HomeDisc lang={language} />
      <PartyMode lang={language} />

      {preview && (
        <MapPreviewCard
          preview={preview}
          lang={language}
          leaving={previewLeaving}
          cardRef={previewCardRef}
          onPointerEnter={() => {
            keepPreview();
            setHoveredLineId(preview.lineId);
          }}
          onPointerLeave={() => {
            setHoveredLineId(null);
            hidePreview(80);
          }}
          onOpen={(lineId, x, y) => {
            const line = lineById[lineId];
            if (line) openLineFromMap(line, x, y);
          }}
        />
      )}
    </div>
  );
}
