// Schematic transit network. Geometry is authored in the design source's SVG
// space (a 2099x1080 board, octolinear - every leg is horizontal, vertical or
// exactly 45deg) and transformed into the map's centered coordinate space at load.
//
// The rendered line follows the raw vertices (with rounded corners); stations are
// then placed ONLY on the straight runs (clear of each rounded corner) so a dot is
// always exactly on the stroke. Interchanges come from real line crossings.
import { roundedPath } from "@/lib/transit-geometry";

export type StationKind = "regular" | "interchange" | "terminal" | "major";

export interface Station {
  id: string;
  name: string;
  x: number;
  y: number;
  kind?: StationKind;
  // Geometric angle of the line segment at this station (degrees: 0=right, 90=down, 45=DR, -45=UR).
  // Used to place labels perpendicular to the line direction.
  segAngle?: number;
  labelSide?: 1 | -1; // which side of the line; 1=default, -1=opposite
  labelAngle?: 45 | -45 | 90 | -90;
  endpoint?: boolean;
  lines?: string[]; // ids of the lines serving this station (>=2 => interchange)
}

export interface Line {
  id: string;
  name: string;
  shortName: string;
  color: string; // CSS var token name (e.g. "line-red")
  kind:
    | "metro"
    | "commuter"
    | "light-rail"
    | "brt"
    | "tram"
    | "bus"
    | "ferry"
    | "cable-car"
    | "regional";
  weight?: number; // optional stroke width override
  dashed?: boolean;
  noPage?: boolean; // line is drawn but its stations are secondary (grey routes)
  pathD: string; // final SVG path `d` in map space (rounded corners)
  label?: LineLabel;
}

export interface LineSegment {
  lineId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  weight: number;
}

export interface LineLabel {
  x: number;
  y: number;
  text: string;
  angle?: number;
}

export interface LineTerminalLabel {
  id: string;
  lineId: string;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
}

// Coordinate transform: design SVG space -> centered map space
// Recentre on the board midpoint and scale so the network spans the same
// magnitude (~1440 wide) as the rest of the map system, keeping every tuned
// constant (stroke weights, station radii, label sizes) visually correct.
const SVG_W = 2099;
const SVG_H = 1080;
const SCALE = 1440 / SVG_W; // approx. 0.686
const CX = SVG_W / 2;
const CY = SVG_H / 2;
const r2 = (n: number) => Math.round(n * 100) / 100;
const tx = (x: number) => r2((x - CX) * SCALE);
const ty = (y: number) => r2((y - CY) * SCALE);

type Pt = [number, number];

// Lines authored as vertex polylines (SVG space)
// Every consecutive pair is horizontal, vertical, or exactly 45deg.
interface RawLine {
  id: string;
  name: string;
  shortName: string;
  color: string;
  kind: Line["kind"];
  pts: Pt[];
  closed?: boolean;
  dashed?: boolean;
  weight?: number;
  noPage?: boolean;
  stationPattern?: "auto" | "endpoints" | "none";
  terminalInterchanges?: {
    start?: string[];
    end?: string[];
  };
  label?: { x: number; y: number; text?: string; angle?: number };
}

const RAW_LINES: RawLine[] = [
  {
    id: "L1",
    name: "Sobre mim",
    shortName: "01",
    color: "line-red",
    kind: "metro",
    closed: true,
    weight: 4.2,
    pts: [
      [678.84, 169.5],
      [1419.84, 169.5],
      [1419.84, 910.5],
      [678.84, 910.5],
    ],
  },
  {
    id: "L2",
    name: "Uptime Center",
    shortName: "02",
    color: "line-green",
    kind: "metro",
    pts: [
      [322.34, 578],
      [612.34, 288],
      [1509.34, 288],
      [1700.84, 96.5],
    ],
  },
  {
    id: "L3",
    name: "Solv",
    shortName: "03",
    color: "line-cobalt",
    kind: "metro",
    pts: [
      [672.34, 353],
      [928.34, 97],
      [1381.34, 97],
    ],
  },
  {
    id: "L4",
    name: "Terapio",
    shortName: "04",
    color: "line-lime",
    kind: "metro",
    pts: [
      [234.34, 735.84],
      [1508.34, 735.84],
      [1700.34, 543.84],
    ],
  },
  {
    id: "L5",
    name: "Musicas",
    shortName: "05",
    color: "line-cyan",
    kind: "metro",
    pts: [
      [133.34, 897],
      [1412.34, 897],
      [1962.34, 347],
    ],
  },
  {
    id: "L6",
    name: "Recomendacoes",
    shortName: "06",
    color: "line-pink",
    kind: "metro",
    pts: [
      [419.34, 1059],
      [662.84, 815.5],
      [1747.34, 815.5],
      [1974.84, 1043],
    ],
  },
  {
    id: "L7",
    name: "Créditos",
    shortName: "07",
    color: "line-orange",
    kind: "metro",
    pts: [
      [1161.84, 452.5],
      [1064.34, 550],
      [1064.34, 1032],
      [716.34, 1032],
      [496.34, 812],
    ],
  },
  {
    id: "L8",
    name: "Ative sua linha",
    shortName: "08",
    color: "line-violet",
    kind: "metro",
    pts: [
      [420.34, 1180],
      [420.34, 419],
      [132.34, 131],
    ],
  },
  {
    id: "L9",
    name: "Aether",
    shortName: "09",
    color: "line-grey",
    kind: "regional",
    dashed: true,
    weight: 3.0,
    pts: [
      [1857.34, 1080],
      [1857.34, 453],
      [1501.84, 97.5],
    ],
  },
  {
    id: "L12",
    name: "Silva",
    shortName: "12",
    color: "line-yellow",
    kind: "metro",
    stationPattern: "endpoints",
    terminalInterchanges: { end: ["L7"] },
    pts: [
      [830.34, 684],
      [976.34, 830],
      [1064.34, 830],
    ],
  },
  {
    id: "L13",
    name: "Boreas",
    shortName: "13",
    color: "line-slate",
    kind: "metro",
    stationPattern: "endpoints",
    pts: [
      [850.34, 640],
      [1000.34, 790],
      [1170.34, 790],
    ],
  },
  // Grey/support lines are drawn on the map, but their stations open no pages.
  {
    id: "LR1",
    name: "Nimbus",
    shortName: "10",
    color: "line-lime",
    kind: "light-rail",
    noPage: true,
    weight: 2.8,
    stationPattern: "endpoints",
    label: { x: 348, y: 368, text: "Nimbus", angle: 45 },
    // Final leg drops straight down (x=392) instead of the old 45deg diagonal,
    // which lay exactly on L7's diagonal (both on y = x + 316) and read as one
    // line stacked on another. The vertical still crosses FY17 (Trama) and L5,
    // so Nimbus keeps its transfers without overlapping any line in parallel.
    pts: [
      [192.34, 248],
      [392.34, 448],
      [392.34, 936],
    ],
  },
  {
    id: "BRT1",
    name: "Vesper",
    shortName: "11",
    color: "line-orange",
    kind: "brt",
    noPage: true,
    weight: 4.2,
    stationPattern: "endpoints",
    label: { x: 1738, y: 500, text: "Vesper", angle: 90 },
    pts: [
      [1880.34, 170],
      [1720.34, 330],
      [1720.34, 725],
      [1950.34, 955],
    ],
  },
  {
    id: "T1",
    name: "Limen",
    shortName: "14",
    color: "line-magenta",
    kind: "tram",
    noPage: true,
    weight: 2.4,
    stationPattern: "endpoints",
    label: { x: 1040, y: 590, text: "Limen" },
    pts: [
      [840.34, 610],
      [1268.34, 610],
      [1418.34, 760],
    ],
  },
  {
    id: "CC1",
    name: "Mons",
    shortName: "15",
    color: "line-rust",
    kind: "cable-car",
    noPage: true,
    weight: 2.2,
    stationPattern: "endpoints",
    label: { x: 380, y: 786, text: "Mons" },
    pts: [
      [174.34, 1010],
      [374.34, 810],
      [560.34, 810],
    ],
  },
  // Eight extra grey "legend" lines, each drawn in its own One Metro World
  // modal style and connected to the wider network.
  {
    id: "CR16",
    name: "Arcus",
    shortName: "16",
    color: "line-grey",
    kind: "commuter",
    noPage: true,
    stationPattern: "endpoints",
    pts: [
      [1840.34, 430],
      [1960.34, 430],
    ],
  },
  {
    id: "FY17",
    name: "Portus",
    shortName: "17",
    color: "line-grey",
    kind: "ferry",
    noPage: true,
    stationPattern: "endpoints",
    pts: [
      [250.34, 470],
      [410.34, 470],
    ],
  },
  {
    id: "LR18",
    name: "Vallis",
    shortName: "18",
    color: "line-grey",
    kind: "light-rail",
    noPage: true,
    stationPattern: "endpoints",
    terminalInterchanges: { start: ["L4"] },
    pts: [
      [234.34, 735.84],
      [234.34, 820],
    ],
  },
  {
    id: "CC19",
    name: "Cacumen",
    shortName: "19",
    color: "line-grey",
    kind: "cable-car",
    noPage: true,
    stationPattern: "endpoints",
    terminalInterchanges: { end: ["L1"] },
    pts: [
      [1000.34, 447.37],
      [1419.84, 447.37],
    ],
  },
  {
    id: "BU20",
    name: "Orbis",
    shortName: "20",
    color: "line-grey",
    kind: "bus",
    noPage: true,
    stationPattern: "endpoints",
    terminalInterchanges: { end: ["L9"] },
    pts: [
      [1700.34, 515.12],
      [1857.34, 515.12],
    ],
  },
  {
    id: "CR21",
    name: "Axis",
    shortName: "21",
    color: "line-grey",
    kind: "commuter",
    noPage: true,
    stationPattern: "endpoints",
    terminalInterchanges: { end: ["L2"] },
    pts: [
      [620.34, 80],
      [870.34, 80],
      [1078.34, 288],
    ],
  },
  {
    id: "T22",
    name: "Meridies",
    shortName: "22",
    color: "line-grey",
    kind: "tram",
    noPage: true,
    stationPattern: "endpoints",
    terminalInterchanges: { end: ["L7"] },
    pts: [
      [200.34, 1050],
      [496.34, 1050],
      [496.34, 812],
    ],
  },
  {
    id: "FY23",
    name: "Auster",
    shortName: "23",
    color: "line-grey",
    kind: "light-rail",
    noPage: true,
    stationPattern: "endpoints",
    terminalInterchanges: { start: ["L4"] },
    pts: [
      [1700.34, 543.84],
      [1880.34, 723.84],
      [1880.34, 1000],
    ],
  },
  // Five more grey legend lines (varied modals). Each branches off a COLOURED
  // line's free terminal and reaches into open board margin — same proven pattern
  // as LR18/FY23/T22 (attaching at an endpoint, not mid-line, keeps the coloured
  // line's even spacing intact). The shared endpoint becomes a real coloured+grey
  // transfer, so none is a lone single-line baldeação.
  {
    id: "CR24",
    name: "Oriens",
    shortName: "24",
    color: "line-grey",
    kind: "commuter",
    noPage: true,
    stationPattern: "endpoints",
    terminalInterchanges: { start: ["L2"] },
    pts: [
      [322.34, 578],
      [250.34, 650],
    ],
  },
  {
    id: "BR25",
    name: "Imus",
    shortName: "25",
    color: "line-grey",
    kind: "brt",
    noPage: true,
    stationPattern: "endpoints",
    terminalInterchanges: { start: ["L3"] },
    pts: [
      [1381.34, 97],
      [1381.34, -20],
    ],
  },
  {
    id: "CC26",
    name: "Specula",
    shortName: "26",
    color: "line-grey",
    kind: "cable-car",
    noPage: true,
    stationPattern: "endpoints",
    terminalInterchanges: { start: ["L5"] },
    pts: [
      [1962.34, 347],
      [2080.34, 229],
    ],
  },
  {
    id: "FY27",
    name: "Pharos",
    shortName: "27",
    color: "line-grey",
    kind: "ferry",
    noPage: true,
    stationPattern: "endpoints",
    terminalInterchanges: { start: ["L6"] },
    pts: [
      [1974.84, 1043],
      [2046.84, 1043],
    ],
  },
  {
    id: "LR28",
    name: "Occidens",
    shortName: "28",
    color: "line-grey",
    kind: "light-rail",
    noPage: true,
    stationPattern: "endpoints",
    terminalInterchanges: { start: ["L5"] },
    pts: [
      [133.34, 897],
      [33.34, 997],
    ],
  },
];

// Segment geometry helpers
// Returns the angle of a line segment in degrees: 0=right, 90=down, 45=DR, -45=UR.
// All segments in this network are H/V/45deg, so we snap to the nearest octant.
function segmentAngle(dx: number, dy: number): number {
  const ax = Math.abs(dx),
    ay = Math.abs(dy);
  if (ax > ay * 4) return dx >= 0 ? 0 : 180;
  if (ay > ax * 4) return dy >= 0 ? 90 : -90;
  if (dx >= 0 && dy >= 0) return 45;
  if (dx >= 0 && dy < 0) return -45;
  if (dx < 0 && dy >= 0) return 135;
  return -135;
}

// Geometry: rounded paths, stations on straight runs, interchanges at crossings
const RADIUS = 32; // corner rounding - MUST match the renderer's LINE_RADIUS
const SPACING = 125; // map-space gap between named intermediate stations
const CORNER_MARGIN = 9; // clearance past a rounded corner before the first stop
const MIN_STATION_GAP = SPACING * 0.62; // removes accidental crowding near transfer nodes
const MERGE = 4; // coincident stations within this distance fuse into one node

const mapVerts = (rl: RawLine): Pt[] => rl.pts.map(([x, y]) => [tx(x), ty(y)] as Pt);

// Tangent length the arc consumes on each leg at an interior vertex (mirrors roundedPath),
// so we can keep stations clear of the curved corner zone.
function tangentDist(prev: Pt, curr: Pt, next: Pt): number {
  const d1x = curr[0] - prev[0],
    d1y = curr[1] - prev[1];
  const d2x = next[0] - curr[0],
    d2y = next[1] - curr[1];
  const l1 = Math.hypot(d1x, d1y),
    l2 = Math.hypot(d2x, d2y);
  if (l1 < 0.01 || l2 < 0.01) return 0;
  const u1x = -d1x / l1,
    u1y = -d1y / l1;
  const u2x = d2x / l2,
    u2y = d2y / l2;
  let dot = u1x * u2x + u1y * u2y;
  dot = Math.max(-1, Math.min(1, dot));
  const ang = Math.acos(dot);
  if (ang > Math.PI - 0.02) return 0;
  return Math.min(RADIUS / Math.tan(ang / 2), Math.min(l1, l2) / 2);
}

const cellKey = (x: number, y: number) => `${Math.round(x / MERGE)},${Math.round(y / MERGE)}`;
const _byCell = new Map<string, Station>();
const _stations: Station[] = [];
const _pathById: Record<string, string> = {};
let _seq = 0;

// Secondary stations are named with unique Latin words (no two alike, and never
// equal to a line name). The pool comfortably exceeds the station count; the Set
// guarantees uniqueness even if the pool were ever exhausted or a seq repeated.
const STATION_NAMES = [
  "Aqua",
  "Ignis",
  "Terra",
  "Ventus",
  "Lumen",
  "Umbra",
  "Nix",
  "Glacies",
  "Ros",
  "Pluvia",
  "Nubes",
  "Fulmen",
  "Tonitrus",
  "Sol",
  "Luna",
  "Stella",
  "Sidus",
  "Aurora",
  "Crepusculum",
  "Nox",
  "Dies",
  "Hora",
  "Tempus",
  "Aevum",
  "Flos",
  "Folium",
  "Radix",
  "Ramus",
  "Frons",
  "Herba",
  "Gramen",
  "Spina",
  "Semen",
  "Arbor",
  "Quercus",
  "Pinus",
  "Laurus",
  "Myrtus",
  "Rosa",
  "Lilium",
  "Viola",
  "Hedera",
  "Vitis",
  "Palma",
  "Cedrus",
  "Avis",
  "Aquila",
  "Corvus",
  "Cygnus",
  "Passer",
  "Lupus",
  "Cervus",
  "Equus",
  "Taurus",
  "Leo",
  "Ursa",
  "Vulpes",
  "Aries",
  "Capra",
  "Piscis",
  "Delphinus",
  "Serpens",
  "Apis",
  "Formica",
  "Papilio",
  "Fons",
  "Rivus",
  "Stagnum",
  "Palus",
  "Litus",
  "Ora",
  "Sinus",
  "Insula",
  "Scopulus",
  "Saxum",
  "Rupes",
  "Vertex",
  "Iugum",
  "Collis",
  "Campus",
  "Ager",
  "Vallum",
  "Limes",
  "Via",
  "Semita",
  "Pons",
  "Arx",
  "Turris",
  "Murus",
  "Porta",
  "Forum",
  "Templum",
  "Ara",
  "Columna",
  "Fornix",
  "Crypta",
  "Cella",
  "Claritas",
  "Fulgor",
  "Nitor",
  "Splendor",
  "Radius",
  "Scintilla",
  "Favilla",
  "Cinis",
  "Fumus",
  "Vapor",
  "Halitus",
  "Aura",
  "Spiritus",
  "Anima",
  "Vox",
  "Sonus",
  "Echo",
  "Silentium",
  "Quies",
  "Pax",
  "Vis",
  "Impetus",
  "Motus",
  "Cursus",
  "Iter",
  "Gradus",
  "Meta",
  "Finis",
  "Initium",
  "Origo",
  "Cardo",
  "Nexus",
  "Vinculum",
  "Nodus",
  "Filum",
  "Tela",
  "Trama",
  "Ordo",
  "Series",
  "Numerus",
  "Modus",
  "Forma",
  "Figura",
  "Linea",
  "Punctum",
  "Angulus",
  "Circulus",
  "Sphaera",
  "Globus",
  "Cubus",
  "Pyramis",
  "Nucleus",
  "Granum",
  "Pollen",
  "Nectar",
  "Mel",
  "Cera",
  "Resina",
  "Gemma",
  "Crystallus",
  "Adamas",
  "Aurum",
  "Argentum",
  "Ferrum",
  "Plumbum",
  "Cuprum",
  "Stannum",
  "Electrum",
  "Marmor",
  "Lapis",
  "Silex",
  "Calx",
  "Creta",
  "Argilla",
  "Pulvis",
  "Arena",
  "Limus",
  "Caelum",
  "Firmamentum",
  "Zenith",
  "Apex",
  "Culmen",
  "Fastigium",
  "Septentrio",
  "Occasus",
  "Ortus",
  "Plaga",
  "Regio",
  "Tractus",
  "Spatium",
  "Locus",
  "Sedes",
  "Mansio",
];
const _usedNames = new Set<string>(RAW_LINES.map((l) => l.name));
let _namePick = 0;
function latinStationName(): string {
  const base = STATION_NAMES[_namePick % STATION_NAMES.length] ?? "Nodus";
  _namePick += 1;
  let name = base;
  let k = 2;
  while (_usedNames.has(name)) name = `${base} ${k++}`;
  _usedNames.add(name);
  return name;
}

function addNode(
  x: number,
  y: number,
  lineId: string,
  sa: number,
  side: 1 | -1,
  kind?: StationKind,
): Station {
  const k = cellKey(x, y);
  const st = _byCell.get(k);
  if (!st) {
    _seq += 1;
    const node: Station = {
      id: `s${_seq}`,
      name: latinStationName(),
      x: r2(x),
      y: r2(y),
      segAngle: sa,
      labelSide: side,
      lines: [lineId],
      kind,
    };
    _byCell.set(k, node);
    _stations.push(node);
    return node;
  }
  if (!st.lines!.includes(lineId)) st.lines!.push(lineId);
  if (kind === "terminal" && st.kind !== "interchange") st.kind = "terminal";
  return st;
}

for (const rl of RAW_LINES) {
  const V = mapVerts(rl);
  const n = V.length;
  const closed = !!rl.closed;
  const stationPattern = rl.stationPattern ?? "auto";
  _pathById[rl.id] = roundedPath(
    V.map(([x, y]) => ({ x, y })),
    RADIUS,
    closed,
  );

  const inset = V.map((_, i) =>
    !closed && (i === 0 || i === n - 1) ? 0 : tangentDist(V[(i - 1 + n) % n], V[i], V[(i + 1) % n]),
  );

  // Every open route gets a stop exactly at both ends. Grey/support routes keep
  // a regular marker so their termini stay visible without gaining page links.
  if (!closed && stationPattern !== "none") {
    const sa0 = segmentAngle(V[1][0] - V[0][0], V[1][1] - V[0][1]);
    const startStation = addNode(
      V[0][0],
      V[0][1],
      rl.id,
      sa0,
      1,
      rl.noPage ? undefined : "terminal",
    );
    startStation.endpoint = true;
    const saN = segmentAngle(V[n - 1][0] - V[n - 2][0], V[n - 1][1] - V[n - 2][1]);
    const endStation = addNode(
      V[n - 1][0],
      V[n - 1][1],
      rl.id,
      saN,
      -1,
      rl.noPage ? undefined : "terminal",
    );
    endStation.endpoint = true;
  }
  if (stationPattern !== "auto") continue;

  const segCount = closed ? n : n - 1;
  const segLens: number[] = [];
  const cumulative = [0];
  for (let k = 0; k < segCount; k++) {
    const a = V[k];
    const b = V[(k + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segLens.push(len);
    cumulative.push(cumulative[k] + len);
  }
  const totalLen = cumulative[segCount];

  const intervals = segLens
    .map((len, k) => {
      const fromClear = closed || k > 0 ? inset[k] + CORNER_MARGIN : 0;
      const toClear = len - (closed || k < segCount - 1 ? inset[(k + 1) % n] + CORNER_MARGIN : 0);
      if (toClear <= fromClear) return null;
      return {
        segIndex: k,
        from: cumulative[k] + fromClear,
        to: cumulative[k] + toClear,
      };
    })
    .filter((value): value is { segIndex: number; from: number; to: number } => !!value);

  const circularDist = (a: number, b: number) => {
    const d = Math.abs(a - b);
    return closed ? Math.min(d, totalLen - d) : d;
  };

  const nearestAllowedDistance = (target: number) => {
    let best = intervals[0]?.from ?? target;
    let bestDelta = Infinity;
    for (const interval of intervals) {
      if (target >= interval.from && target <= interval.to) return target;
      for (const edge of [interval.from, interval.to]) {
        const delta = circularDist(target, edge);
        if (delta < bestDelta) {
          bestDelta = delta;
          best = edge;
        }
      }
    }
    return best;
  };

  const pointAtDistance = (dist: number) => {
    const d = ((dist % totalLen) + totalLen) % totalLen;
    let k = cumulative.findIndex(
      (start, index) => index < segCount && d >= start && d <= cumulative[index + 1],
    );
    if (k < 0) k = segCount - 1;
    const a = V[k];
    const b = V[(k + 1) % n];
    const len = segLens[k] || 1;
    const t = Math.max(0, Math.min(1, (d - cumulative[k]) / len));
    return {
      x: a[0] + (b[0] - a[0]) * t,
      y: a[1] + (b[1] - a[1]) * t,
      sa: segmentAngle(b[0] - a[0], b[1] - a[1]),
    };
  };

  const stopCount = closed
    ? Math.max(4, Math.round(totalLen / SPACING))
    : Math.max(0, Math.round(totalLen / SPACING) - 1);

  let toggle = 0;
  for (let j = 0; j < stopCount; j++) {
    const rawDist = closed
      ? ((j + 0.5) * totalLen) / stopCount
      : ((j + 1) * totalLen) / (stopCount + 1);
    const p = pointAtDistance(nearestAllowedDistance(rawDist));
    const side: 1 | -1 = toggle++ % 2 === 0 ? 1 : -1;
    addNode(p.x, p.y, rl.id, p.sa, side);
  }
}

// Interchanges from real line crossings
function segHit(p1: Pt, p2: Pt, p3: Pt, p4: Pt): Pt | null {
  const d1x = p2[0] - p1[0],
    d1y = p2[1] - p1[1];
  const d2x = p4[0] - p3[0],
    d2y = p4[1] - p3[1];
  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) < 1e-6) return null; // parallel
  const t = ((p3[0] - p1[0]) * d2y - (p3[1] - p1[1]) * d2x) / den;
  const u = ((p3[0] - p1[0]) * d1y - (p3[1] - p1[1]) * d1x) / den;
  if (t < 0.04 || t > 0.96 || u < 0.04 || u > 0.96) return null; // proper interior crossing only
  return [p1[0] + d1x * t, p1[1] + d1y * t];
}

// Lines
// routes still draw + carry stops, but their crossings don't clutter the map.
const _lineSegs = RAW_LINES.map((rl) => {
  const V = mapVerts(rl);
  const n = V.length;
  const segs: [Pt, Pt][] = [];
  const m = rl.closed ? n : n - 1;
  for (let k = 0; k < m; k++) segs.push([V[k], V[(k + 1) % n]]);
  return { id: rl.id, segs };
});

interface Cross {
  x: number;
  y: number;
  count: number;
  lines: Set<string>;
  sa: number;
}
const _crosses: Cross[] = [];
const CLUSTER = MERGE * 1.5;
for (let i = 0; i < _lineSegs.length; i++) {
  for (let j = i + 1; j < _lineSegs.length; j++) {
    for (const [a, b] of _lineSegs[i].segs) {
      for (const [c, d] of _lineSegs[j].segs) {
        const p = segHit(a, b, c, d);
        if (!p) continue;
        let cl = _crosses.find((x) => Math.hypot(x.x - p[0], x.y - p[1]) < CLUSTER);
        if (!cl) {
          cl = {
            x: p[0],
            y: p[1],
            count: 1,
            lines: new Set(),
            sa: segmentAngle(b[0] - a[0], b[1] - a[1]),
          };
          _crosses.push(cl);
        } else {
          cl.x = (cl.x * cl.count + p[0]) / (cl.count + 1);
          cl.y = (cl.y * cl.count + p[1]) / (cl.count + 1);
          cl.count += 1;
        }
        cl.lines.add(_lineSegs[i].id);
        cl.lines.add(_lineSegs[j].id);
      }
    }
  }
}

// Not every crossing is a transfer: keep them sparse on each line, while making
// sure every line still has at least one connection.
_crosses.sort((a, b) => {
  if (b.lines.size !== a.lines.size) return b.lines.size - a.lines.size;
  const ra = Math.abs(Math.sin(a.x * 12.9898 + a.y * 78.233));
  const rb = Math.abs(Math.sin(b.x * 12.9898 + b.y * 78.233));
  return rb - ra;
});
const TRANSFER_MIN_GAP = SPACING * 0.72;
const _keptCrosses: Cross[] = [];
const _coveredTransferLines = new Set<string>();
const keepCross = (cross: Cross) => {
  _keptCrosses.push(cross);
  for (const lineId of cross.lines) _coveredTransferLines.add(lineId);
};
const tooCloseToKeptTransfer = (cross: Cross) =>
  _keptCrosses.some(
    (kept) =>
      [...cross.lines].some((lineId) => kept.lines.has(lineId)) &&
      Math.hypot(kept.x - cross.x, kept.y - cross.y) < TRANSFER_MIN_GAP,
  );

for (const cross of _crosses) {
  if (!tooCloseToKeptTransfer(cross)) keepCross(cross);
}

for (const line of _lineSegs) {
  if (_coveredTransferLines.has(line.id)) continue;
  const fallback = _crosses.find((cross) => cross.lines.has(line.id));
  if (fallback && !_keptCrosses.includes(fallback)) keepCross(fallback);
}

let toggleX = 0;
for (const c of _keptCrosses) {
  const terminalAtCross = _stations.find(
    (station) =>
      (station.kind === "terminal" || station.endpoint) &&
      (station.lines ?? []).some((lineId) => c.lines.has(lineId)) &&
      Math.hypot(station.x - c.x, station.y - c.y) < MERGE,
  );

  // Clear plain stops that fall on the crossing, then reuse a coincident
  // terminal or drop one interchange marker there.
  for (let i = _stations.length - 1; i >= 0; i--) {
    const s = _stations[i];
    if (s.kind === "interchange" || s.kind === "terminal" || s.endpoint) continue;
    const sharesCrossingLine = (s.lines ?? []).some((lineId) => c.lines.has(lineId));
    if (sharesCrossingLine && Math.hypot(s.x - c.x, s.y - c.y) < MIN_STATION_GAP) {
      _byCell.delete(cellKey(s.x, s.y));
      _stations.splice(i, 1);
    }
  }

  _seq += 1;
  if (terminalAtCross) {
    terminalAtCross.kind = "interchange";
    terminalAtCross.lines = [...new Set([...(terminalAtCross.lines ?? []), ...c.lines])];
    terminalAtCross.segAngle = c.sa;
    terminalAtCross.labelSide = toggleX++ % 2 === 0 ? 1 : -1;
    continue;
  }

  _stations.push({
    id: `x${_seq}`,
    name: latinStationName(),
    x: r2(c.x),
    y: r2(c.y),
    segAngle: c.sa,
    labelSide: toggleX++ % 2 === 0 ? 1 : -1,
    kind: "interchange",
    lines: [...c.lines],
  });
}

// Lines
// endpoints are one interchange node, not a transfer followed by a second
// terminal a few pixels later.
for (const line of RAW_LINES) {
  if (!line.terminalInterchanges) continue;
  const vertices = mapVerts(line);
  const endpointSpecs = [
    { point: vertices[0], lines: line.terminalInterchanges.start },
    { point: vertices[vertices.length - 1], lines: line.terminalInterchanges.end },
  ] as const;

  for (const spec of endpointSpecs) {
    if (!spec.lines?.length) continue;
    const station = _stations.find(
      (candidate) =>
        candidate.endpoint &&
        candidate.lines?.includes(line.id) &&
        Math.hypot(candidate.x - spec.point[0], candidate.y - spec.point[1]) < MERGE,
    );
    if (!station) continue;
    station.kind = "interchange";
    station.lines = [...new Set([...(station.lines ?? []), ...spec.lines])];
  }
}

const stationLabelAngleOverrides = new Map<string, Station["labelAngle"]>([
  ["s77", -45],
  ["s113", -45],
]);
// A few stations sit in a corner pocket where the default label side aims into
// the crowded inside of the turn; flip them to the open outside of the bend.
const stationLabelSideOverrides = new Map<string, 1 | -1>([
  ["s20", 1], // Nox: squeezed between the L2 corner and the Pax interchange
]);
// Manual nudges (kept exactly on the line) for the rare auto stop that lands
// too near a corner/interchange to spacing- and label-clear cleanly.
const stationPositionOverrides = new Map<string, { x: number; y: number }>([
  // Nox was at d=240 on L2's diagonal (41px from the corner); recentre it at the
  // midpoint of the Finis->corner gap so spacing evens out and its name clears L2.
  ["s20", { x: -366, y: -107 }],
]);
for (const station of _stations) {
  const angle = stationLabelAngleOverrides.get(station.id);
  if (angle !== undefined) station.labelAngle = angle;
  const side = stationLabelSideOverrides.get(station.id);
  if (side !== undefined) station.labelSide = side;
  const pos = stationPositionOverrides.get(station.id);
  if (pos !== undefined) {
    station.x = pos.x;
    station.y = pos.y;
  }
}

function lineSpacingTools(rl: RawLine) {
  const V = mapVerts(rl);
  const n = V.length;
  const closed = !!rl.closed;
  const segCount = closed ? n : n - 1;
  const inset = V.map((_, i) =>
    !closed && (i === 0 || i === n - 1) ? 0 : tangentDist(V[(i - 1 + n) % n], V[i], V[(i + 1) % n]),
  );
  const segLens: number[] = [];
  const cumulative = [0];
  for (let k = 0; k < segCount; k++) {
    const a = V[k];
    const b = V[(k + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segLens.push(len);
    cumulative.push(cumulative[k] + len);
  }
  const totalLen = cumulative[segCount];
  const intervals = segLens
    .map((len, k) => {
      const fromClear = closed || k > 0 ? inset[k] + CORNER_MARGIN : 0;
      const toClear = len - (closed || k < segCount - 1 ? inset[(k + 1) % n] + CORNER_MARGIN : 0);
      if (toClear <= fromClear) return null;
      return { from: cumulative[k] + fromClear, to: cumulative[k] + toClear };
    })
    .filter((value): value is { from: number; to: number } => !!value);

  const circularDist = (a: number, b: number) => {
    const d = Math.abs(a - b);
    return closed ? Math.min(d, totalLen - d) : d;
  };
  const nearestAllowedDistance = (target: number) => {
    let best = intervals[0]?.from ?? target;
    let bestDelta = Infinity;
    for (const interval of intervals) {
      if (target >= interval.from && target <= interval.to) return target;
      for (const edge of [interval.from, interval.to]) {
        const delta = circularDist(target, edge);
        if (delta < bestDelta) {
          bestDelta = delta;
          best = edge;
        }
      }
    }
    return best;
  };
  const pointAtDistance = (dist: number) => {
    const d = ((dist % totalLen) + totalLen) % totalLen;
    let k = cumulative.findIndex(
      (start, index) => index < segCount && d >= start && d <= cumulative[index + 1],
    );
    if (k < 0) k = segCount - 1;
    const a = V[k];
    const b = V[(k + 1) % n];
    const len = segLens[k] || 1;
    const t = Math.max(0, Math.min(1, (d - cumulative[k]) / len));
    return {
      x: a[0] + (b[0] - a[0]) * t,
      y: a[1] + (b[1] - a[1]) * t,
      sa: segmentAngle(b[0] - a[0], b[1] - a[1]),
    };
  };
  const project = (s: Station) => {
    let best: { off: number; pos: number } | null = null;
    for (let k = 0; k < segCount; k++) {
      const a = V[k];
      const b = V[(k + 1) % n];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len2 = dx * dx + dy * dy;
      const len = Math.sqrt(len2);
      if (len < 0.01) continue;
      const t = Math.max(0, Math.min(1, ((s.x - a[0]) * dx + (s.y - a[1]) * dy) / len2));
      const x = a[0] + dx * t;
      const y = a[1] + dy * t;
      const off = Math.hypot(s.x - x, s.y - y);
      const pos = cumulative[k] + len * t;
      if (!best || off < best.off) best = { off, pos };
    }
    return best;
  };
  return { closed, totalLen, pointAtDistance, nearestAllowedDistance, project };
}

for (const rl of RAW_LINES) {
  if ((rl.stationPattern ?? "auto") !== "auto") continue;
  const tools = lineSpacingTools(rl);
  const projected = _stations
    .filter((s) => s.lines?.includes(rl.id))
    .map((s) => tools.project(s))
    .filter((p): p is { off: number; pos: number } => !!p && p.off < 8)
    .map((p) => p.pos)
    .sort((a, b) => a - b);

  const stops: number[] = [];
  for (const pos of projected) {
    if (!stops.length || Math.abs(pos - stops[stops.length - 1]) > 3) stops.push(pos);
  }
  if (stops.length < 2) continue;

  const gaps: Array<{ from: number; gap: number }> = [];
  for (let i = 1; i < stops.length; i++)
    gaps.push({ from: stops[i - 1], gap: stops[i] - stops[i - 1] });
  if (tools.closed)
    gaps.push({
      from: stops[stops.length - 1],
      gap: tools.totalLen - stops[stops.length - 1] + stops[0],
    });

  let toggle = 0;
  for (const { from, gap } of gaps) {
    if (gap <= SPACING * 1.45) continue;
    const pieces = Math.max(2, Math.round(gap / SPACING));
    for (let i = 1; i < pieces; i++) {
      const rawDist = from + (gap * i) / pieces;
      const allowed = tools.nearestAllowedDistance(rawDist);
      const p = tools.pointAtDistance(allowed);
      const side: 1 | -1 = toggle++ % 2 === 0 ? 1 : -1;
      addNode(p.x, p.y, rl.id, p.sa, side);
    }
  }
}

export const stations: Station[] = _stations;

// Lines
export const lines: Line[] = [
  ...RAW_LINES.map(
    (rl): Line => ({
      id: rl.id,
      name: rl.name,
      shortName: rl.shortName,
      color: rl.color,
      kind: rl.kind,
      weight: rl.weight,
      dashed: rl.dashed,
      noPage: rl.noPage,
      pathD: _pathById[rl.id],
      label: rl.label
        ? {
            x: tx(rl.label.x),
            y: ty(rl.label.y),
            text: rl.label.text ?? rl.name,
            angle: rl.label.angle,
          }
        : undefined,
    }),
  ),
];

function unitAway(from: Pt, toward: Pt): { x: number; y: number } {
  const dx = from[0] - toward[0];
  const dy = from[1] - toward[1];
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function unitFromCenter(p: Pt): { x: number; y: number } {
  const len = Math.hypot(p[0], p[1]) || 1;
  return { x: p[0] / len, y: p[1] / len };
}

export const lineTerminals: LineTerminalLabel[] = RAW_LINES.flatMap((rl) => {
  const V = mapVerts(rl);
  if (V.length < 2) return [];
  if (rl.closed) {
    const opposite = Math.floor(V.length / 2);
    const a = unitFromCenter(V[0]);
    const b = unitFromCenter(V[opposite]);
    return [
      { id: `${rl.id}-a`, lineId: rl.id, x: V[0][0], y: V[0][1], dirX: a.x, dirY: a.y },
      {
        id: `${rl.id}-b`,
        lineId: rl.id,
        x: V[opposite][0],
        y: V[opposite][1],
        dirX: b.x,
        dirY: b.y,
      },
    ];
  }
  const start = unitAway(V[0], V[1]);
  const end = unitAway(V[V.length - 1], V[V.length - 2]);
  return [
    { id: `${rl.id}-start`, lineId: rl.id, x: V[0][0], y: V[0][1], dirX: start.x, dirY: start.y },
    {
      id: `${rl.id}-end`,
      lineId: rl.id,
      x: V[V.length - 1][0],
      y: V[V.length - 1][1],
      dirX: end.x,
      dirY: end.y,
    },
  ];
});

export const lineSegments: LineSegment[] = RAW_LINES.flatMap((rl) => {
  const V = mapVerts(rl);
  const segs: LineSegment[] = [];
  const count = rl.closed ? V.length : V.length - 1;
  for (let i = 0; i < count; i++) {
    const a = V[i];
    const b = V[(i + 1) % V.length];
    segs.push({
      lineId: rl.id,
      x1: a[0],
      y1: a[1],
      x2: b[0],
      y2: b[1],
      weight: rl.weight ?? 4,
    });
  }
  return segs;
});
