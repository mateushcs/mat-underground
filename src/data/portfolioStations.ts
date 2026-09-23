// Technical / map config for each station. The user-facing TEXT lives in
// `portfolioContent.ts` (editable) — this file only holds the line id and the
// accent colour used by the UI and the transition origin.
export interface PortfolioStation {
  /** URL slug: /station/<slug> */
  slug: string;
  /** map line this station belongs to (L1…L9); also the key into portfolioContent */
  lineId: string;
  /** accent colour (UI tint + transition origin colour) */
  accent: string;
  /** false = not a navigable station (no link on the map) */
  active?: boolean;
  /** true = clicking opens the contact form instead of navigating */
  contact?: boolean;
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
  },
  {
    slug: "solv",
    lineId: "L3",
    accent: "#7588b0",
  },
  {
    slug: "terapio",
    lineId: "L4",
    accent: "#8aa765",
  },
  {
    slug: "musicas",
    lineId: "L5",
    accent: "#6e9ead",
  },
  {
    slug: "tour-house",
    lineId: "L9",
    accent: "#7da09a",
  },
  {
    slug: "creditos",
    lineId: "L7",
    accent: "#ba8c5c",
  },
  {
    slug: "contato",
    lineId: "L8",
    accent: "#8a78a8",
    active: false,
    contact: true,
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

/** A linha de contato (terminal "Ative sua linha"): clicar abre o formulário. */
export const contactLineId: string | null =
  portfolioStations.find((station) => station.contact)?.lineId ?? null;

export function isContactLine(lineId: string): boolean {
  return contactLineId !== null && lineId === contactLineId;
}
