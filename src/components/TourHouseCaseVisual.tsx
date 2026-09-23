import { CaseResults } from "./CaseResults";
import { useState } from "react";
import {
  Activity,
  Building2,
  Car,
  ClipboardCheck,
  LayoutDashboard,
  Plane,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

function CaseIcon({ icon: Icon, large = false }: { icon: LucideIcon; large?: boolean }) {
  return <Icon className={large ? "case-icon case-icon--large" : "case-icon"} strokeWidth={1.5} aria-hidden="true" focusable="false" />;
}

const statIcons = [Users, LayoutDashboard, ClipboardCheck];

export function TourHouseCaseVisual({ section, lang }: { section: string; lang: "pt" | "en" }) {
  const en = lang === "en";
  const [step, setStep] = useState(0);

  if (["contexto", "context"].includes(section)) {
    const scope = en
      ? ["Flights", "Hotels", "Cars", "Bus", "Travel policy", "Approvals", "Cost control"]
      : ["Aéreo", "Hospedagem", "Veículos", "Rodoviário", "Política de viagem", "Aprovações", "Controle de custo"];
    return (
      <div className="case-visual case-criteria">
        <h3>{en ? "Corporate travel management" : "Gestão de viagens corporativas"}</h3>
        <ul>{scope.map((item) => <li key={item}><CaseIcon icon={Plane} />{item}</li>)}</ul>
      </div>
    );
  }

  if (["operacao", "operation"].includes(section)) {
    return (
      <figure className="case-visual case-network">
        <figcaption className="case-eyebrow">{en ? "User profiles" : "Perfis de uso"}</figcaption>
        <div className="case-network-track">
          <div className="case-network-sources">
            <span><CaseIcon icon={UserRound} />{en ? "Traveller" : "Viajante"}</span>
            <span><CaseIcon icon={ClipboardCheck} />{en ? "Approver" : "Aprovador"}</span>
            <span><CaseIcon icon={Building2} />{en ? "Manager" : "Gestor"}</span>
          </div>
          <span className="case-network-arrow" aria-hidden="true">→</span>
          <div className="case-network-hub"><CaseIcon icon={Activity} large />OBT<span>{en ? "Each client's rules" : "Regras de cada cliente"}</span></div>
          <span className="case-network-arrow" aria-hidden="true">→</span>
          <div className="case-network-person"><CaseIcon icon={Car} large />{en ? "One decision" : "Uma decisão"}<span>{en ? "with policy in context" : "com a política em contexto"}</span></div>
        </div>
      </figure>
    );
  }

  if (["desafio", "challenge"].includes(section)) {
    const company = en ? ["Travel policy", "Approvals", "Cost centres", "Budget"] : ["Política de viagem", "Aprovações", "Centros de custo", "Orçamento"];
    const people = en ? ["Get it done fast", "Decide with context", "See the spend"] : ["Resolver rápido", "Decidir com contexto", "Enxergar o gasto"];
    return (
      <div className="case-comparison case-visual">
        <div><CaseIcon icon={Building2} large /><h3>{en ? "Travel policy" : "Política de viagem"}</h3>
          <ul>{company.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
        <div><CaseIcon icon={UserRound} large /><h3>{en ? "Independent booking" : "Autonomia na reserva"}</h3>
          <ul>{people.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      </div>
    );
  }

  if (["processo", "process"].includes(section)) {
    const stats = en
      ? [["3", "audiences"], ["4", "fronts"], ["17+", "sprints"]]
      : [["3", "públicos"], ["4", "frentes"], ["17+", "sprints"]];
    return (
      <div className="case-visual case-outcomes case-outcomes--stats">
        <span className="case-eyebrow">{en ? "Scope of the work" : "Escopo do trabalho"}</span>
        <div>{stats.map(([value, title], i) => <article key={title}><CaseIcon icon={statIcons[i]} large /><span className="case-stat">{value}</span><h3>{title}</h3></article>)}</div>
      </div>
    );
  }

  if (["solucao", "solution"].includes(section)) {
    const steps = en
      ? [
          ["Search", "Flights, hotels, cars and bus in a single search, with the AI assistant in beta."],
          ["Choose", "Advanced search and recent searches, so nobody starts from scratch."],
          ["Policy", "The company's rules applied on the spot, without the user memorising anything."],
          ["Approve and book", "The approver decides with context and the booking moves forward."],
        ]
      : [
          ["Buscar", "Aéreo, hospedagem, veículos e rodoviário numa busca só, com a IA em beta."],
          ["Escolher", "Busca avançada e últimas buscas, para ninguém recomeçar do zero."],
          ["Política", "As regras da empresa aplicadas na hora, sem o usuário decorar nada."],
          ["Aprovar e reservar", "O aprovador decide com contexto e a reserva segue."],
        ];
    return (
      <div className="case-visual case-flow">
        <h3>{en ? "Booking steps" : "Etapas da reserva"}</h3>
        <div className="case-flow-steps" role="group" aria-label={en ? "Booking steps" : "Etapas da reserva"}>
          {steps.map(([title], i) => (
            <button type="button" key={title} aria-pressed={step === i} onClick={() => setStep(i)}>
              <span className="case-flow-index">{String(i + 1).padStart(2, "0")}</span>
              {title}
            </button>
          ))}
        </div>
        <p className="case-interactive-detail" aria-live="polite">{steps[step][1]}</p>
      </div>
    );
  }

  if (["resultados", "results"].includes(section)) return <CaseResults lineId="L9" lang={lang} />;

  return null;
}
