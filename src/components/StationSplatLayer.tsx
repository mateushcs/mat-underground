import { useMemo, useRef } from "react";
import { SplatBackground } from "@/components/SplatBackground";
import { SplatControls } from "@/components/SplatControls";
import {
  activeGlobalEffects,
  DEFAULT_PRESET,
  deriveLook,
  type SplatController,
  type SplatPreset,
} from "@/lib/splatFx";
import type { PortfolioStation } from "@/data/portfolioStations";

interface StationSplatLayerProps {
  station: PortfolioStation;
  tune: boolean;
  onReady?: () => void;
}

export function StationSplatLayer({ station, tune, onReady }: StationSplatLayerProps) {
  const controllerRef = useRef<SplatController | null>(null);
  const stationPreset = useMemo<SplatPreset>(() => {
    const tuned = station.preset;
    const global = activeGlobalEffects();
    const hasEffects = !!tuned?.effects && Object.keys(tuned.effects).length > 0;
    return {
      camera: { ...DEFAULT_PRESET.camera, ...(tuned?.camera ?? {}) },
      effects: global ?? (hasEffects ? tuned!.effects : deriveLook(station.accent)),
    };
  }, [station]);

  return (
    <>
      <SplatBackground
        url={station.ply ?? "/subway.spz"}
        preset={stationPreset}
        interactive={!tune}
        controllerRef={controllerRef}
        onReady={onReady}
      />
      {tune && <SplatControls controllerRef={controllerRef} preset={stationPreset} />}
    </>
  );
}
