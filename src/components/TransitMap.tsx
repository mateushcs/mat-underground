import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { flushSync } from "react-dom";
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
  splatUrlForLine,
  stationSlugForLine,
  stationSlugForLines,
} from "@/data/portfolioStations";
import { portfolioContent } from "@/data/portfolioContent";
import {
  getStoredLanguage,
  htmlLang,
  LANGUAGES,
  setStoredLanguage,
  type ContentLang,
} from "@/lib/language";
import { getStoredTheme, setStoredTheme, themeAttrs, type MapTheme } from "@/lib/theme";
import { BookOpen, Boxes, Moon, Sun } from "lucide-react";
import { warmSplat } from "@/lib/prefetchSplats";
import { setViewMode, useViewMode } from "@/lib/viewMode";
import { layoutLabels, secondaryLabelAngles, type Box, type LabelItem } from "@/lib/labelLayout";
import { useRouteTransition, type DissolveOrigin } from "@/components/RouteTransition";
import { MapAtmosphere } from "@/components/MapAtmosphere";
import { ContactModal } from "@/components/ContactModal";
import { MovingTrains } from "@/components/MovingTrains";

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
  const [view, setView] = useState<ViewState>(() => getRememberedMapView());
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
    rememberMapView(view);
  }, [view]);
  // Which line is currently focused via the menu legend (hover). When set, every
  // other line / station / label on the map dims to FOCUS_DIM.
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  // Render light on the server, then adopt the visitor's stored choice/system preference on mount.
  const [theme, setTheme] = useState<MapTheme>("light");
  useEffect(() => setTheme(getStoredTheme()), []);
  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: MapTheme = prev === "dark" ? "light" : "dark";
      setStoredTheme(next);
      return next;
    });
  }, []);
  // Deep-link: /?contact=1 abre o formulário de contato direto.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("contact")) setContactOpen(true);
  }, []);
  const isDimmed = useCallback(
    (ids: string[]) => hoveredLineId !== null && !ids.includes(hoveredLineId),
    [hoveredLineId],
  );

  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  useEffect(() => {
    setStoredLanguage(language);
    document.documentElement.lang = htmlLang(language);
  }, [language]);

  const viewMode = useViewMode();

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
      rememberMapView(viewRef.current);
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

  // --- Silent pan / zoom (pointer + pinch) ---
  const isPanning = useRef(false);
  const moved = useRef(false);
  const panStart = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchLastDist = useRef<number | null>(null);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 1) {
      isPanning.current = true;
      moved.current = false;
      panStart.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
      pinchLastDist.current = null;
    } else if (activePointers.current.size === 2) {
      isPanning.current = false;
      const pts = [...activePointers.current.values()];
      pinchLastDist.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 2) {
      const pts = [...activePointers.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchLastDist.current !== null && dist > 0) {
        const ratio = dist / pinchLastDist.current;
        setView((v) => clampViewToMap({ ...v, k: v.k * ratio }));
      }
      pinchLastDist.current = dist;
      return;
    }

    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    if (!moved.current && Math.hypot(dx, dy) > 4) moved.current = true;
    setView((v) =>
      clampViewToMap({
        ...v,
        x: panStart.current.vx + dx / v.k,
        y: panStart.current.vy + dy / v.k,
      }),
    );
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    activePointers.current.delete(e.pointerId);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (activePointers.current.size < 2) {
      pinchLastDist.current = null;
    }
    if (activePointers.current.size === 0) {
      isPanning.current = false;
    } else if (activePointers.current.size === 1) {
      // One finger remains after pinch — resume pan from current position
      const [remaining] = activePointers.current.values();
      setView((v) => {
        panStart.current = { x: remaining.x, y: remaining.y, vx: v.x, vy: v.y };
        isPanning.current = true;
        return v;
      });
    }
  };

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setView((v) => {
      const k = v.k * Math.exp(-e.deltaY * 0.0015);
      return clampViewToMap({ ...v, k });
    });
  }, []);
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
      data-map-theme={themeAttrs(theme).mapTheme}
      data-map-aesthetic={themeAttrs(theme).aesthetic}
      data-transition-surface="map"
      className="map-dot-grid relative h-screen w-screen overflow-hidden font-sans"
      suppressHydrationWarning
    >
      <MapAtmosphere />

      <svg
        ref={svgRef}
        className="map-stage relative h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
        viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onMapClick}
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
                x2="100%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  stopColor={`color-mix(in srgb, var(--${line.color}) 72%, white)`}
                />
                <stop offset="55%" stopColor={`var(--${line.color})`} />
                <stop
                  offset="100%"
                  stopColor={`color-mix(in srgb, var(--${line.color}) 82%, #040608)`}
                />
              </linearGradient>
            ))}
        </defs>

        <g
          ref={mapContentRef}
          transform={`translate(${view.x * view.k} ${view.y * view.k}) scale(${view.k})`}
        >
          {/* Line casings — dark halo so crossings read cleanly */}
          <g aria-label="line-casings">
            {allLines.map((line) => (
              <path
                key={`casing-${line.id}`}
                className="map-focusable"
                d={line.pathD}
                fill="none"
                stroke="var(--map-bg)"
                strokeWidth={lineWidth(line) + (line.noPage ? 1.6 : 2.4)}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={isDimmed([line.id]) ? FOCUS_DIM : 1}
              />
            ))}
          </g>

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
              if (line.kind === "brt" || line.kind === "light-rail") {
                return (
                  <g
                    key={`line-${line.id}`}
                    className="map-focusable"
                    opacity={isDimmed([line.id]) ? FOCUS_DIM : 1}
                  >
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
                <path
                  key={`line-${line.id}`}
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
                  opacity={isDimmed([line.id]) ? FOCUS_DIM : 1}
                />
              );
            })}
          </g>

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
                  onMouseEnter={() => {
                    setHoveredLineId(line.id);
                    warmStationRoute(slug);
                    const u = splatUrlForLine(line.id);
                    if (u) warmSplat(u);
                  }}
                  onMouseLeave={() => setHoveredLineId(null)}
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
                <circle
                  key={station.id}
                  className="sub-station-marker map-focusable"
                  cx={station.x}
                  cy={station.y}
                  r={1.75}
                  fill="var(--map-station-fill)"
                  stroke={`var(--${lineVisualColor(line)})`}
                  strokeWidth={0.8}
                  vectorEffect="non-scaling-stroke"
                  opacity={isDimmed([station.lineId]) ? FOCUS_DIM : 0.94}
                />
              );
            })}
          </g>

          <MovingTrains lines={allLines} colorForLine={lineVisualColor} />

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
                      rx={2.5}
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
                    rx={2.5}
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
                      rx={hub.thick / 2}
                      fill="var(--map-station-fill)"
                      stroke="var(--map-ink)"
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                    />
                    {cols.map((c, i) => (
                      <circle
                        key={i}
                        cx={s.x + (dots[i]?.along ?? 0)}
                        cy={s.y}
                        r={2.5}
                        fill={`var(--${c})`}
                      />
                    ))}
                  </g>
                );
              } else if (kind === "major") {
                marker = (
                  <g>
                    <circle
                      cx={s.x}
                      cy={s.y}
                      r={6.4}
                      fill="var(--map-station-fill)"
                      stroke="var(--map-ink)"
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                    />
                    <circle cx={s.x} cy={s.y} r={2.2} fill="var(--map-ink)" />
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
                  marker = <circle cx={s.x} cy={s.y} r={1.9} fill={color} />;
                } else if (markerLine.kind === "commuter") {
                  marker = (
                    <g>
                      <circle cx={s.x} cy={s.y} r={2.8} fill={color} />
                      <circle cx={s.x} cy={s.y} r={1} fill="var(--map-bg)" />
                    </g>
                  );
                } else {
                  marker = (
                    <circle
                      cx={s.x}
                      cy={s.y}
                      r={2.4}
                      fill="var(--map-bg)"
                      stroke={color}
                      strokeWidth={0.8}
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                }
              } else {
                marker = (
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={2.3}
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
                    <circle
                      cx={s.x}
                      cy={s.y}
                      r={kind === "interchange" || kind === "terminal" ? 16 : 10}
                      fill="transparent"
                      style={{ pointerEvents: "all" }}
                    />
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
                            rx={2.2}
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
        aria-label="Linhas ativas"
        className="map-legend pointer-events-auto flex flex-col items-start gap-[3px]"
        onMouseLeave={() => setHoveredLineId(null)}
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
          <button
            type="button"
            className={`map-mode-toggle${viewMode === "3d" ? " is-active" : ""}`}
            onClick={() => setViewMode(viewMode === "3d" ? "lite" : "3d")}
            aria-pressed={viewMode === "3d"}
            data-tip={
              language === "en"
                ? "3D mode loads 3D backgrounds on the stations! but it can be quite heavy."
                : "o modo 3D carrega fundos 3D nas estações! mas pode ser bem pesado."
            }
            aria-label={
              (viewMode === "3d"
                ? language === "en"
                  ? "Back to lite mode. "
                  : "Voltar ao modo leve. "
                : language === "en"
                  ? "Turn on 3D mode. "
                  : "Ativar modo 3D. ") +
              (language === "en"
                ? "3D mode loads 3D backgrounds on the stations but it can be quite heavy."
                : "O modo 3D carrega fundos 3D nas estações mas pode ser bem pesado.")
            }
          >
            <Boxes className="h-3.5 w-3.5" aria-hidden="true" />
            <span>3D</span>
          </button>
        </div>
        <ul className="map-line-list">
          {activeLines.map((line) => {
            const slug = stationSlugForLine(line.id);
            const focused = hoveredLineId === line.id;
            const dimmed = hoveredLineId !== null && !focused;
            return (
              <li key={line.id}>
                <button
                  type="button"
                  onMouseEnter={() => {
                    setHoveredLineId(line.id);
                    warmStationRoute(slug);
                    const u = splatUrlForLine(line.id);
                    if (u) warmSplat(u);
                  }}
                  onFocus={() => {
                    setHoveredLineId(line.id);
                    warmStationRoute(slug);
                  }}
                  onBlur={() => setHoveredLineId(null)}
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
                    className={`map-line-number${COLORED_LINE_IDS.has(line.id) ? "" : " is-grey"}`}
                    style={{ background: `var(--${lineVisualColor(line)})` }}
                  >
                    {lineNumber(line.shortName)}
                  </span>
                  <span className="map-line-name">{lineCopy[language][line.id] ?? line.name}</span>
                  <span
                    className="map-line-arrow"
                    style={{
                      transform: `rotate(${snappedArrowAngle(lineArrowAngle[line.id] ?? 0)}deg)`,
                    }}
                  >
                    <svg viewBox="0 0 48 48" aria-hidden="true">
                      <path d="M7 24H39M28 13L39 24L28 35" />
                    </svg>
                  </span>
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
    </div>
  );
}
