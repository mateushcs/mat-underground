import { CaseResults } from "./CaseResults";
import { useState } from "react";
import {
  Activity,
  CalendarClock,
  Check,
  HeartPulse,
  Layers3,
  Search,
  Smartphone,
  Target,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

function CaseIcon({ icon: Icon, large = false }: { icon: LucideIcon; large?: boolean }) {
  return <Icon className={large ? "case-icon case-icon--large" : "case-icon"} strokeWidth={1.5} aria-hidden="true" focusable="false" />;
}


export function TerapioCaseVisual({ section, lang }: { section: string; lang: "pt" | "en" }) {
  const en = lang === "en";
  const [mode, setMode] = useState<"watch" | "do">("watch");

  if (["contexto", "context"].includes(section)) {
    const facts = en
      ? [["2021", "Year"], ["7 months", "Duration"], ["3 people", "Team"]]
      : [["2021", "Ano"], ["7 meses", "Duração"], ["3 pessoas", "Equipe"]];
    return (
      <div className="case-visual case-outcomes case-outcomes--stats">
        <span className="case-eyebrow">{en ? "TIM AWC accelerator" : "Aceleração TIM AWC"}</span>
        <div>{facts.map(([value, label], i) => <article key={label}><CaseIcon icon={[CalendarClock, HeartPulse, Users][i]} large /><span className="case-stat">{value}</span><h3>{label}</h3></article>)}</div>
      </div>
    );
  }

  if (["operacao", "operation"].includes(section)) {
    return (
      <figure className="case-visual case-network">
        <figcaption className="case-eyebrow">{en ? "Patient and physiotherapist" : "Paciente e fisioterapeuta"}</figcaption>
        <div className="case-network-track">
          <div className="case-network-sources">
            <span><CaseIcon icon={UserRound} />{en ? "Patient" : "Paciente"}</span>
            <span><CaseIcon icon={HeartPulse} />{en ? "Physiotherapist" : "Fisioterapeuta"}</span>
          </div>
          <span className="case-network-arrow" aria-hidden="true">→</span>
          <div className="case-network-hub"><CaseIcon icon={Activity} large />Terapio<span>{en ? "One care journey" : "Um cuidado"}</span></div>
          <span className="case-network-arrow" aria-hidden="true">→</span>
          <div className="case-network-person"><CaseIcon icon={Smartphone} large />{en ? "Each app" : "Cada app"}<span>{en ? "for its own routine" : "para a sua rotina"}</span></div>
        </div>
      </figure>
    );
  }

  if (["desafio", "challenge"].includes(section)) {
    const clinic = en ? ["Guided by the therapist", "Equipment available", "Scheduled time"] : ["Orientação do fisioterapeuta", "Equipamentos por perto", "Hora marcada"];
    const home = en ? ["Instructions must be remembered", "No one to correct the movement", "Phone in hand while exercising"] : ["Instruções precisam ser lembradas", "Ninguém corrige o movimento", "Celular na mão durante o exercício"];
    return (
      <div className="case-comparison case-visual">
        <div><CaseIcon icon={HeartPulse} large /><h3>{en ? "In-person support" : "Acompanhamento presencial"}</h3>
          <ul>{clinic.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
        <div><CaseIcon icon={Smartphone} large /><h3>{en ? "Home exercises" : "Exercícios em casa"}</h3>
          <ul>{home.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      </div>
    );
  }

  if (["processo", "process"].includes(section)) {
    const phases = en
      ? ["Desk research", "15+ interviews", "Jobs to be Done", "Experimentation", "Low-cost prototype", "Testing and adjustments"]
      : ["Pesquisa de mesa", "15+ entrevistas", "Jobs to be Done", "Experimentação", "Protótipo de baixo custo", "Testes e ajustes"];
    return (
      <div className="case-visual case-criteria">
        <h3>{en ? "Research stages" : "Etapas da pesquisa"}</h3>
        <ul>{phases.map((p) => <li key={p}><CaseIcon icon={Search} />{p}</li>)}</ul>
      </div>
    );
  }

  if (["solucao", "solution"].includes(section)) {
    return (
      <div className="case-visual case-player">
        <h3>{en ? "Watch without holding the phone." : "Assistir sem segurar o celular."}</h3>
        <div className="case-player-layout">
          <div className={`case-player-phone is-${mode}`}>
            <div className="case-player-screen">
              {mode === "watch" ? (
                <>
                  <div className="case-player-video" />
                  <div className="case-player-bar"><span style={{ width: "42%" }} /></div>
                  <div className="case-player-caption">{en ? "Exercise video, step by step" : "Vídeo do exercício, passo a passo"}</div>
                </>
              ) : (
                <>
                  <div className="case-player-step">{en ? "Step 3 of 8" : "Passo 3 de 8"}</div>
                  <div className="case-player-do">{en ? "Raise the arm slowly and hold" : "Eleve o braço devagar e segure"}</div>
                  <div className="case-player-actions"><span>{en ? "Done" : "Feito"}</span><span>{en ? "Next" : "Próximo"}</span></div>
                </>
              )}
            </div>
          </div>
          <div className="case-player-side">
            <div className="case-choice-row" role="group" aria-label={en ? "Player mode" : "Modo do player"}>
              <button type="button" aria-pressed={mode === "watch"} onClick={() => setMode("watch")}>{en ? "Watch" : "Assistir"}</button>
              <button type="button" aria-pressed={mode === "do"} onClick={() => setMode("do")}>{en ? "Do it" : "Executar"}</button>
            </div>
            <p className="case-interactive-detail" aria-live="polite">
              {mode === "watch"
                ? (en ? "The video builds confidence, but holding the phone during the exercise gets in the way." : "O vídeo dá confiança, mas segurar o celular durante o exercício atrapalha.")
                : (en ? "In doing mode the phone can rest: large controls, visible progress and hands free." : "No modo executar, o celular pode ficar apoiado: controles grandes, progresso visível e mãos livres.")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (["resultados", "results"].includes(section)) return <CaseResults lineId="L4" lang={lang} />;

  return null;
}
