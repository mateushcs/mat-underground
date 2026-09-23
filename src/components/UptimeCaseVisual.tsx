import { CaseResults } from "./CaseResults";
import { useState } from "react";
import { Activity, BellRing, Boxes, CalendarCheck2, Database, Gauge, Layers3, Network, Radio, ShieldCheck, Table2, Target, UserRound, Wifi, WifiOff, type LucideIcon } from "lucide-react";

const signalIcons = [Wifi, WifiOff, Radio];
const journeyIcons = [Gauge, BellRing, CalendarCheck2];

function CaseIcon({ icon: Icon, large = false }: { icon: LucideIcon; large?: boolean }) {
  return <Icon className={large ? "case-icon case-icon--large" : "case-icon"} strokeWidth={1.5} aria-hidden="true" focusable="false" />;
}

export function UptimeCaseVisual({ section, lang }: { section: string; lang: "pt" | "en" }) {
  const en = lang === "en";
  const [step, setStep] = useState(0);
  if (["contexto", "context"].includes(section)) {
    return (
      <div className="case-comparison case-visual">
        <div><CaseIcon icon={Table2} large /><h3>{en ? "Before" : "Antes"}</h3>
          <ul>{(en ? ["Individual spreadsheets", "Personal reminders", "Knowledge held in memory"] : ["Planilhas individuais", "Lembretes pessoais", "Conhecimento na memória"]).map(x => <li key={x}>{x}</li>)}</ul>
        </div>
        <div><CaseIcon icon={Network} large /><h3>{en ? "After" : "Depois"}</h3>
          <ul>{(en ? ["Integrated records", "Preventive maintenance alerts", "Context for consultant decisions"] : ["Registros integrados", "Alertas de manutenção preventiva", "Contexto para o consultor decidir"]).map(x => <li key={x}>{x}</li>)}</ul>
        </div>
      </div>
    );
  }
  if (["operacao", "operation"].includes(section)) {
    return (
      <figure className="case-visual case-network">
        <figcaption className="case-eyebrow">{en ? "Information flow" : "Fluxo da informação"}</figcaption>
        <div className="case-network-track">
          <div className="case-network-sources"><span><CaseIcon icon={Database} />SAP</span><span><CaseIcon icon={Boxes} />{en ? "Parts & internal systems" : "Peças e sistemas internos"}</span><span><CaseIcon icon={Radio} />{en ? "Machine telemetry" : "Telemetria das máquinas"}</span></div>
          <span className="case-network-arrow" aria-hidden="true">→</span>
          <div className="case-network-hub"><CaseIcon icon={Activity} large />Uptime<span>{en ? "Connected context" : "Contexto integrado"}</span></div>
          <span className="case-network-arrow" aria-hidden="true">→</span>
          <div className="case-network-person"><CaseIcon icon={UserRound} large />{en ? "Consultant" : "Consultor"}<span>{en ? "Understands, prioritizes, acts" : "Entende, prioriza, age"}</span></div>
        </div>
      </figure>
    );
  }
  if (["desafio", "challenge"].includes(section)) {
    const states = en ? ["Signal available", "No communication", "Signal returns"] : ["Com sinal", "Sem comunicação", "Sinal retorna"];
    const details = en ? ["The latest transmission and location provide a reference for monitoring the machine.", "Missing telemetry does not prove downtime. The last known information and the communication gap remain part of the analysis.", "The machine’s condition on return is interpreted alongside its history and the period without communication."] : ["O último envio e a localização registrada oferecem uma referência para acompanhar a máquina.", "Ausência de telemetria não comprova uma parada. O último registro e o período sem comunicação continuam fazendo parte da análise.", "A condição da máquina no retorno é interpretada junto com o histórico e o período sem comunicação."];
    return (
      <div className="case-visual case-signal">
        <h3>{en ? "Interpreting signal loss" : "Interpretação da ausência de sinal"}</h3>
        <div className="case-choice-row" role="group" aria-label={en ? "Telemetry scenario" : "Cenário de telemetria"}>
          {states.map((state, i) => <button type="button" key={state} aria-pressed={step === i} onClick={() => setStep(i)}><CaseIcon icon={signalIcons[i]} />{state}</button>)}
        </div>
        <div className={`case-signal-bars case-signal-bars--${step}`} aria-hidden="true">{Array.from({ length: 30 }, (_, i) => <span key={i} style={{ height: `${24 + ((i * 37) % 65)}%` }} />)}</div>
        <p className="case-interactive-detail" aria-live="polite">{details[step]}</p>
      </div>
    );
  }
  if (["solucao", "solution"].includes(section)) {
    const titles = en ? ["Track usage", "Notify", "Schedule"] : ["Acompanhar o uso", "Alertar", "Agendar"];
    const descriptions = en ? ["The system calculates the approach to a maintenance milestone, such as the first 500 operating hours for applicable machines.", "An alert reaches the consultant responsible for that customer, turning usage information into a follow-up task.", "The consultant calls the customer to schedule a Tracbel technician’s preventive maintenance visit in advance."] : ["O sistema calcula a aproximação do marco de manutenção — como as primeiras 500 horas, nas máquinas às quais essa regra se aplica.", "Um alerta chega ao consultor responsável pelo cliente, transformando a informação de uso em uma ação de acompanhamento.", "O consultor liga para o cliente e agenda antecipadamente a visita técnica da Tracbel para a manutenção preventiva."];
    return (
      <div className="case-visual case-journey">
        <span className="case-eyebrow">{en ? "Preventive maintenance" : "Manutenção preventiva"}</span>
        <div className="case-journey-steps" role="group" aria-label={en ? "Maintenance journey" : "Jornada da manutenção"}>
          {titles.map((title, i) => <button type="button" key={title} onClick={() => setStep(i)} aria-pressed={step === i}><span className="case-step-marker">{String(i + 1).padStart(2, "0")}<CaseIcon icon={journeyIcons[i]} /></span>{title}</button>)}
        </div>
        <p className="case-interactive-detail" aria-live="polite">{descriptions[step]}</p>
      </div>
    );
  }
  if (["resultados", "results"].includes(section)) return <CaseResults lineId="L2" lang={lang} />;

  return null;
}
