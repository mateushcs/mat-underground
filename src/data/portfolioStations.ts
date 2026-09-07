import type { SplatPreset } from "@/lib/splatFx";

// Technical / map config for each station. The user-facing TEXT lives in
// `portfolioContent.ts` (editable) — this file only holds the line id, accent,
// splat (.sog) and tuned camera/effects preset.
export interface PortfolioStation {
  /** URL slug: /station/<slug> */
  slug: string;
  /** map line this station belongs to (L1…L8); also the key into portfolioContent */
  lineId: string;
  /** accent colour (UI tint + transition origin colour) */
  accent: string;
  /** false = not a navigable station (no link on the map) */
  active?: boolean;
  /** true = clicking opens the contact form instead of navigating */
  contact?: boolean;
  /** this station's splat in /public (.sog; fallback: /subway.sog) */
  ply?: string;
  /**
   * Full camera + effects preset, tuned in /station/<slug>?tune=1 (COPIAR PRESET).
   * Without it, DEFAULT_PRESET is used.
   */
  preset?: SplatPreset;
}

export const portfolioStations: PortfolioStation[] = [
  {
    slug: "sobre-mim",
    lineId: "L1",
    accent: "#b97973",
  },
  {
    slug: "uptime-center",
    lineId: "L2",
    accent: "#7f9f82",
    ply: "/stations/pexels-jakubzerdzicki-17904822.sog",
    preset: {
      camera: {
        radiusScale: 1,
        dolly: 1.3,
        fov: 25,
        parallaxDeg: 0,
        damping: 0.3,
        orientation: [Math.PI, 0, 0],
        position: [-0.01, -0.42, -5.06],
        target: [-0.78, -2.62, -39.43],
      },
      effects: { duo: { dark: "#181e1d", light: "#cedbd0", amount: 0.7 } },
    },
  },
  {
    slug: "solv",
    lineId: "L3",
    accent: "#7588b0",
    ply: "/stations/pexels-lilartsy-2748059.sog",
    preset: {
      camera: {
        radiusScale: 0.68,
        dolly: 1.3,
        fov: 80,
        parallaxDeg: 0,
        damping: 0.16,
        orientation: [Math.PI, 0, 0],
        position: [0.99, -0.72, -11.16],
        target: [1.62, 2.68, -54.13],
      },
      effects: {},
    },
  },
  {
    slug: "terapio",
    lineId: "L4",
    accent: "#8aa765",
    ply: "/stations/pexels-sarisecils-7635515.sog",
    preset: {
      camera: {
        radiusScale: 0.41,
        dolly: 1.06,
        fov: 28,
        parallaxDeg: 1,
        damping: 0.19,
        orientation: [Math.PI, 0, 0],
        position: [-0.41, 0.08, -8.06],
        target: [3.32, 3.38, -75.13],
      },
      effects: {},
    },
  },
  {
    slug: "musicas",
    lineId: "L5",
    accent: "#6e9ead",
    ply: "/stations/pexels-theshuttervision-9660905.sog",
    preset: {
      camera: {
        radiusScale: 1,
        dolly: 1.29,
        fov: 80,
        parallaxDeg: 1,
        damping: 0.19,
        orientation: [Math.PI, 0, 0],
        position: [-0.01, -0.12, -8.76],
        target: [0.12, 0.98, -64.03],
      },
      effects: {
        sharp: { amount: 0.6 },
        duo: { dark: "#151e24", light: "#c8dae0", amount: 0.7 },
        grv: { grain: 0.08, vig: 0.72 },
        bloom: { strength: 0.32, radius: 0.45, threshold: 0.62 },
        irid: { amount: 0.4098 },
        prism: { amount: 0.0139 },
      },
    },
  },
  {
    slug: "tour-house",
    lineId: "L9",
    accent: "#7da09a",
    // No dedicated scene yet: reuse the recomendacoes (L6) splat + tuned preset,
    // so 3D mode is framed correctly and the lite poster (a copy of
    // recomendacoes.jpg) matches what 3D shows.
    ply: "/stations/pexels-xayriddin-37431887.sog",
    preset: {
      camera: {
        radiusScale: 0.68,
        dolly: 1.3,
        fov: 28,
        parallaxDeg: 1,
        damping: 0.19,
        orientation: [Math.PI, 0, 0],
        position: [0.29, -0.22, -6.96],
        target: [3.52, 2.98, -58.23],
      },
      effects: {
        sharp: { amount: 0.6 },
        duo: { dark: "#211a21", light: "#e4d0d9", amount: 0.7 },
        grv: { grain: 0.08, vig: 0.72 },
        bloom: { strength: 0.32, radius: 0.45, threshold: 0.62 },
        irid: { amount: 0.3658 },
        prism: { amount: 0.0119 },
      },
    },
  },
  {
    slug: "creditos",
    lineId: "L7",
    accent: "#ba8c5c",
    ply: "/stations/pexels-94973479-9272340.sog",
    preset: {
      camera: {
        radiusScale: 0.2,
        dolly: 1.13,
        fov: 60,
        parallaxDeg: 1,
        damping: 0.19,
        orientation: [Math.PI, 0, 0],
        position: [0.09, 0.28, -8.46],
        target: [9.92, 3.38, -56.63],
      },
      effects: {},
    },
  },
  {
    slug: "contato",
    lineId: "L8",
    accent: "#8a78a8",
    active: false,
    contact: true,
    ply: "/stations/pexels-aditya-moses-1360843-2632308.sog",
  },
];

export const portfolioStationBySlug = Object.fromEntries(
  portfolioStations.map((station) => [station.slug, station]),
) as Record<string, PortfolioStation>;

const slugByLineId = Object.fromEntries(
  portfolioStations
    .filter((station) => station.active !== false)
    .map((station) => [station.lineId, station.slug]),
) as Record<string, string>;

export function stationSlugForLines(lineIds: string[]): string | null {
  for (const lineId of lineIds) {
    const slug = slugByLineId[lineId];
    if (slug) return slug;
  }
  return null;
}

export function stationSlugForLine(lineId: string): string | null {
  return slugByLineId[lineId] ?? null;
}

/** The splat file a line's station will load (null for lines without a page). */
export function splatUrlForLine(lineId: string): string | null {
  const slug = slugByLineId[lineId];
  if (!slug) return null;
  return portfolioStationBySlug[slug]?.ply ?? "/subway.sog";
}

/** A linha de contato (terminal "Ative sua linha"): clicar abre o formulário. */
export const contactLineId: string | null =
  portfolioStations.find((station) => station.contact)?.lineId ?? null;

export function isContactLine(lineId: string): boolean {
  return contactLineId !== null && lineId === contactLineId;
}
