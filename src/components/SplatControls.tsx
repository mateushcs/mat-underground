import { useState, type RefObject } from "react";
import {
  CAMERA_SCHEMA,
  clearGlobalEffects,
  configFromPreset,
  configToPreset,
  DEFAULT_PRESET,
  FX_SCHEMA,
  loadGlobalEffects,
  PRESETS,
  saveGlobalEffects,
  type EditableConfig,
  type SplatController,
  type SplatPreset,
} from "@/lib/splatFx";

interface SplatControlsProps {
  controllerRef: RefObject<SplatController | null>;
  /** preset desta estação (inicializa os controles no ponto certo) */
  preset?: SplatPreset;
}

/**
 * In-app tuning panel (porta do "Splat Explorer"). Gated behind ?tune so it
 * never ships to visitors. Drives the live pipeline through the controller and
 * exports the current look as a JSON preset.
 */
export function SplatControls({ controllerRef, preset = DEFAULT_PRESET }: SplatControlsProps) {
  const [cfg, setCfg] = useState<EditableConfig>(() => {
    // Começa do look global salvo (se houver) — o tuner é global.
    const global = loadGlobalEffects();
    return configFromPreset(
      global && Object.keys(global).length > 0
        ? { camera: preset.camera, effects: global }
        : preset,
    );
  });
  const [pose, setPose] = useState<{ position: number[]; target: number[] }>(() => ({
    position: [...(preset.camera.position ?? [3.09, 1.68, -6.46])],
    target: [...(preset.camera.target ?? [7.72, 1.68, -39.43])],
  }));
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const setPoseAxis = (group: "position" | "target", axis: number, value: number) => {
    setPose((prev) => {
      const next = { position: [...prev.position], target: [...prev.target] };
      next[group][axis] = value;
      controllerRef.current?.setPose({
        [group]: next[group] as [number, number, number],
      });
      return next;
    });
  };

  // Só efeitos — NÃO mexe na câmera (a câmera vem dos sliders de câmera e da
  // POSE; reaplicar radiusScale aqui resetava o enquadramento).
  const pushPreset = (next: EditableConfig) => {
    const c = controllerRef.current;
    if (!c) return;
    c.applyPreset(configToPreset(next));
    // tuner global: salva os efeitos pra valerem em todas as estações
    saveGlobalEffects(configToPreset(next).effects);
  };

  const setEffectEnabled = (key: string, on: boolean) => {
    setCfg((prev) => {
      const next = {
        ...prev,
        effects: { ...prev.effects, [key]: { ...prev.effects[key], enabled: on } },
      };
      pushPreset(next);
      return next;
    });
  };

  const setEffectParam = (key: string, name: string, value: number | string | boolean) => {
    setCfg((prev) => {
      const next = {
        ...prev,
        effects: { ...prev.effects, [key]: { ...prev.effects[key], [name]: value } },
      };
      pushPreset(next);
      return next;
    });
  };

  const setCam = (key: (typeof CAMERA_SCHEMA)[number]["key"], value: number) => {
    setCfg((prev) => {
      const next = { ...prev, camera: { ...prev.camera, [key]: value } };
      controllerRef.current?.setCamera({ [key]: value });
      return next;
    });
  };

  const loadPreset = (name: string) => {
    setCfg((prev) => {
      const fxCfg = configFromPreset({ camera: {}, effects: PRESETS[name] });
      const next: EditableConfig = { camera: prev.camera, effects: fxCfg.effects };
      pushPreset(next);
      return next;
    });
  };

  const copyJSON = () => {
    const preset = configToPreset(cfg);
    preset.camera = {
      ...preset.camera,
      orientation: controllerRef.current?.getOrientation() ?? [Math.PI, 0, 0],
      ...(controllerRef.current?.getPose() ?? {}),
    };
    void navigator.clipboard.writeText(JSON.stringify(preset, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1100);
  };

  // Só os efeitos (sem câmera) — pra colar no GLOBAL_EFFECTS e valer pra todas.
  const copyEffects = () => {
    void navigator.clipboard.writeText(JSON.stringify(configToPreset(cfg).effects, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1100);
  };

  if (!open) {
    return (
      <button className="splat-tuner-fab" onClick={() => setOpen(true)} type="button">
        ▤ tuner
      </button>
    );
  }

  return (
    <aside className="splat-tuner">
      <header className="st-hd">
        <h2>SPLAT TUNER</h2>
        <button onClick={() => setOpen(false)} type="button" aria-label="fechar">
          ✕
        </button>
      </header>

      <div className="st-presets">
        {Object.keys(PRESETS).map((name) => (
          <button key={name} onClick={() => loadPreset(name)} type="button">
            {name}
          </button>
        ))}
      </div>

      <section className="st-sec">
        <div className="st-sec-hd">CÂMERA / VIEW</div>
        {CAMERA_SCHEMA.map((c) => (
          <label key={c.key} className="st-row">
            <span className="st-label">{c.label}</span>
            <input
              type="range"
              min={c.min}
              max={c.max}
              step={c.step}
              value={cfg.camera[c.key]}
              onChange={(e) => setCam(c.key, parseFloat(e.target.value))}
            />
            <span className="st-val">{fmt(cfg.camera[c.key])}</span>
          </label>
        ))}
        <div className="st-btns">
          <button onClick={() => controllerRef.current?.flip("x")} type="button">
            flip X
          </button>
          <button onClick={() => controllerRef.current?.flip("y")} type="button">
            flip Y
          </button>
          <button onClick={() => controllerRef.current?.flip("z")} type="button">
            flip Z
          </button>
          <button onClick={() => controllerRef.current?.flipView()} type="button">
            flip view
          </button>
          <button onClick={() => controllerRef.current?.recenter()} type="button">
            recenter
          </button>
        </div>
      </section>

      <section className="st-sec">
        <div className="st-sec-hd">POSE (SuperSplat)</div>
        {(["position", "target"] as const).map((group) => (
          <label key={group} className="st-row">
            <span className="st-label">{group === "position" ? "câmera" : "alvo"}</span>
            {[0, 1, 2].map((axis) => (
              <input
                key={axis}
                className="st-num"
                type="number"
                step={0.1}
                value={pose[group][axis]}
                onChange={(e) => setPoseAxis(group, axis, parseFloat(e.target.value) || 0)}
              />
            ))}
          </label>
        ))}
        <div className="mini-hint">x · y · z &nbsp;—&nbsp; iguale a fig 1 e copie</div>
      </section>

      {FX_SCHEMA.map((fx) => {
        const e = cfg.effects[fx.key];
        return (
          <section className={`st-sec${e.enabled ? " on" : ""}`} key={fx.key}>
            <div className="st-sec-hd">
              <span>{fx.name}</span>
              <button
                className={`st-sw${e.enabled ? " on" : ""}`}
                onClick={() => setEffectEnabled(fx.key, !e.enabled)}
                type="button"
                aria-pressed={e.enabled}
              />
            </div>
            {e.enabled &&
              fx.ctrls.map((ctrl) => {
                if (ctrl.t === "range") {
                  return (
                    <label key={ctrl.key} className="st-row">
                      <span className="st-label">{ctrl.label}</span>
                      <input
                        type="range"
                        min={ctrl.min}
                        max={ctrl.max}
                        step={ctrl.step}
                        value={e[ctrl.key] as number}
                        onChange={(ev) =>
                          setEffectParam(fx.key, ctrl.key, parseFloat(ev.target.value))
                        }
                      />
                      <span className="st-val">{fmt(e[ctrl.key] as number)}</span>
                    </label>
                  );
                }
                if (ctrl.t === "color") {
                  return (
                    <label key={ctrl.key} className="st-row">
                      <span className="st-label">{ctrl.label}</span>
                      <input
                        type="color"
                        value={e[ctrl.key] as string}
                        onChange={(ev) => setEffectParam(fx.key, ctrl.key, ev.target.value)}
                      />
                      <span className="st-val">{e[ctrl.key] as string}</span>
                    </label>
                  );
                }
                return (
                  <label key={ctrl.key} className="st-row">
                    <span className="st-label">{ctrl.label}</span>
                    <button
                      className={`st-sw${e[ctrl.key] ? " on" : ""}`}
                      onClick={() => setEffectParam(fx.key, ctrl.key, !e[ctrl.key])}
                      type="button"
                      aria-pressed={Boolean(e[ctrl.key])}
                    />
                  </label>
                );
              })}
          </section>
        );
      })}

      <button className="st-copy" onClick={copyEffects} type="button">
        {copied ? "copiado ✓" : "COPIAR EFEITOS (global)"}
      </button>
      <button className="st-copy" onClick={copyJSON} type="button">
        COPIAR PRESET (estação)
      </button>
      <button
        className="st-copy"
        onClick={() => {
          clearGlobalEffects();
          window.location.reload();
        }}
        type="button"
      >
        ↺ voltar pro por-estação
      </button>
    </aside>
  );
}

function fmt(v: number): string {
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2).replace(/^0/, "");
}
