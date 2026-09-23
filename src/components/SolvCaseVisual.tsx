import { CaseResults } from "./CaseResults";
import { useState } from "react";
import {
  Activity,
  Boxes,
  Gauge,
  ShieldCheck,
  Sparkles,
  Tag,
  Target,
  TrendingUp,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

function CaseIcon({ icon: Icon, large = false }: { icon: LucideIcon; large?: boolean }) {
  return <Icon className={large ? "case-icon case-icon--large" : "case-icon"} strokeWidth={1.5} aria-hidden="true" focusable="false" />;
}


type SolvCard = { title: string; tags: string[] };

const SOLV_CARDS: Record<"pt" | "en", SolvCard[]> = {
  pt: [
    { title: "Chamada de startups", tags: ["Externo", "Startups"] },
    { title: "Programa de ideias", tags: ["Interno", "Ideias"] },
    { title: "Desafio de sustentabilidade", tags: ["Externo", "Sustentabilidade"] },
    { title: "Melhoria contínua", tags: ["Interno", "Processos"] },
    { title: "Programa de IA", tags: ["Interno", "Tecnologia"] },
    { title: "Ideias de produto", tags: ["Interno", "Produto"] },
  ],
  en: [
    { title: "Startup call", tags: ["External", "Startups"] },
    { title: "Ideas program", tags: ["Internal", "Ideas"] },
    { title: "Sustainability challenge", tags: ["External", "Sustainability"] },
    { title: "Continuous improvement", tags: ["Internal", "Processes"] },
    { title: "AI program", tags: ["Internal", "Technology"] },
    { title: "Product ideas", tags: ["Internal", "Product"] },
  ],
};

export function SolvCaseVisual({ section, lang }: { section: string; lang: "pt" | "en" }) {
  const en = lang === "en";
  const [active, setActive] = useState<string[]>([]);

  if (["contexto", "context"].includes(section)) {
    const before = en ? ["Idea forms", "Startup screening", "White label"] : ["Formulários de ideias", "Triagem de startups", "White label"];
    const now = en ? ["Internal innovation and portfolio", "Continuous improvement", "AI copilot"] : ["Inovação interna e portfólio", "Melhoria contínua", "Copiloto de IA"];
    return (
      <div className="case-comparison case-visual">
        <div><CaseIcon icon={Boxes} large /><h3>{en ? "Forms and screening." : "Formulários e triagem."}</h3>
          <ul>{before.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
        <div><CaseIcon icon={Sparkles} large /><h3>{en ? "An innovation platform." : "Uma plataforma de inovação."}</h3>
          <ul>{now.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      </div>
    );
  }

  if (["operacao", "operation"].includes(section)) {
    return (
      <figure className="case-visual case-network">
        <figcaption className="case-eyebrow">{en ? "User profiles" : "Perfis de uso"}</figcaption>
        <div className="case-network-track">
          <div className="case-network-sources">
            <span><CaseIcon icon={Boxes} />{en ? "Innovation manager" : "Gestor de inovação"}</span>
            <span><CaseIcon icon={UserRound} />{en ? "Evaluator" : "Avaliador"}</span>
            <span><CaseIcon icon={Users} />{en ? "Participant" : "Participante"}</span>
          </div>
          <span className="case-network-arrow" aria-hidden="true">→</span>
          <div className="case-network-hub"><CaseIcon icon={Activity} large />Solv<span>{en ? "One context" : "Um contexto"}</span></div>
          <span className="case-network-arrow" aria-hidden="true">→</span>
          <div className="case-network-person"><CaseIcon icon={Target} large />{en ? "Each one" : "Cada um"}<span>{en ? "with what they need" : "com o que precisa"}</span></div>
        </div>
      </figure>
    );
  }

  if (["desafio", "challenge"].includes(section)) {
    // The same programs, grouped three different ways: each client wanted its own.
    const columns = en
      ? [
          { who: "Client A", by: "by program", items: ["Startup call", "Ideas program", "AI program"] },
          { who: "Client B", by: "by business area", items: ["Operations", "Sustainability", "Technology"] },
          { who: "Client C", by: "by stage", items: ["Applications", "Evaluation", "Approved"] },
        ]
      : [
          { who: "Cliente A", by: "por programa", items: ["Chamada de startups", "Programa de ideias", "Programa de IA"] },
          { who: "Cliente B", by: "por área da empresa", items: ["Operações", "Sustentabilidade", "Tecnologia"] },
          { who: "Cliente C", by: "por etapa", items: ["Inscrições", "Avaliação", "Aprovados"] },
        ];
    return (
      <div className="case-visual case-organization">
        <h3>{en ? "Same data, three ways to organize it" : "Os mesmos dados, três jeitos de organizar"}</h3>
        <div className="case-organization-grid">
          {columns.map((col) => (
            <div key={col.who}>
              <p className="case-organization-head">
                <strong>{col.who}</strong> {en ? "organizes" : "organiza"} {col.by}
              </p>
              <ol>{col.items.map((item) => <li key={item}><CaseIcon icon={Tag} />{item}</li>)}</ol>
            </div>
          ))}
        </div>
        <p className="case-interactive-detail">
          {en
            ? "The product only offered one fixed structure, so each client worked around it. Tags let every team group the same applications its own way."
            : "O produto só oferecia uma estrutura fixa, e cada cliente dava um jeito por fora. As tags deixaram cada time agrupar as mesmas inscrições do seu jeito."}
        </p>
      </div>
    );
  }

  if (["processo", "process"].includes(section)) {
    const criteria = en
      ? ["Appeal to new clients", "Frequency of use", "Retention of existing clients", "Sales value", "Effort"]
      : ["Atratividade para novos clientes", "Frequência de uso", "Retenção dos clientes atuais", "Valor de venda", "Esforço"];
    return (
      <div className="case-visual case-criteria">
        <h3>{en ? "Roadmap criteria" : "Critérios do roadmap"}</h3>
        <ul>{criteria.map((c) => <li key={c}><CaseIcon icon={Gauge} />{c}</li>)}</ul>
        <p className="case-interactive-detail">{en ? "Each feature was scored against these criteria and aligned with marketing, so the roadmap reflected the priority of the moment." : "Cada feature era pontuada por esses critérios e alinhada com o marketing, para o roadmap refletir a prioridade do momento."}</p>
      </div>
    );
  }

  if (["solucao", "solution"].includes(section)) {
    const cards = SOLV_CARDS[lang];
    const allTags = [...new Set(cards.flatMap((c) => c.tags))];
    const toggle = (t: string) => setActive((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
    const visible = active.length === 0 ? cards : cards.filter((c) => c.tags.some((t) => active.includes(t)));
    return (
      <div className="case-visual case-tagsflow">
        <h3>{en ? "Filtering initiatives" : "Filtro de iniciativas"}</h3>
        <div className="case-tagsflow-tags" role="group" aria-label={en ? "Tags" : "Tags"}>
          {allTags.map((t) => (
            <button type="button" key={t} aria-pressed={active.includes(t)} onClick={() => toggle(t)}>{t}</button>
          ))}
          {active.length > 0 && <button type="button" className="is-clear" onClick={() => setActive([])}>{en ? "Clear" : "Limpar"}</button>}
        </div>
        <ul className="case-tagsflow-cards">
          {visible.map((c) => (
            <li key={c.title}>
              <strong>{c.title}</strong>
              <span>{c.tags.map((t) => <em key={t} className={active.includes(t) ? "is-on" : ""}><Tag aria-hidden="true" />{t}</em>)}</span>
            </li>
          ))}
        </ul>
        <p className="case-interactive-detail" aria-live="polite">{en ? `${visible.length} of ${cards.length} initiatives shown${active.length ? "" : ", no filter active"}. Tags work the same way across dashboards, tables and applications.` : `${visible.length} de ${cards.length} iniciativas${active.length ? "" : ", nenhum filtro ativo"}. As tags funcionam do mesmo jeito em dashboards, tabelas e inscrições.`}</p>
      </div>
    );
  }

  if (["resultados", "results"].includes(section)) return <CaseResults lineId="L3" lang={lang} />;

  return null;
}
