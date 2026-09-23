import type { ComponentType } from "react";
import { UptimeCaseVisual } from "./UptimeCaseVisual";
import { SolvCaseVisual } from "./SolvCaseVisual";
import { TerapioCaseVisual } from "./TerapioCaseVisual";
import { TourHouseCaseVisual } from "./TourHouseCaseVisual";

export interface CaseVisualProps {
  section: string;
  lang: "pt" | "en";
}

export interface CaseExtras {
  /** Optional per-section visual blocks for this case. */
  Visual?: ComponentType<CaseVisualProps>;
  /** Section ids where the visual must not render (e.g. already covered). */
  visualExcluded?: string[];
}

// Editorial extras per case. The route stays generic: it only knows the registry,
// so a new case plugs in here instead of adding `lineId === "Lx"` checks.
export const CASE_EXTRAS: Record<string, CaseExtras> = {
  L2: { Visual: UptimeCaseVisual, visualExcluded: ["operacao", "operation"] },
  L3: { Visual: SolvCaseVisual },
  L4: { Visual: TerapioCaseVisual },
  L9: { Visual: TourHouseCaseVisual },
};
