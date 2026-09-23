import {
  ArrowRight,
  Compass,
  Route,
  Radio,
  RefreshCw,
  Target,
  Layers3,
  ListChecks,
  Workflow,
  Tags,
  Search,
  HeartPulse,
  Smartphone,
  Plane,
  ClipboardCheck,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";

interface CaseProcessDef {
  /** Section ids (pt and en) this diagram belongs to. */
  sections: string[];
  icon: LucideIcon;
  pt: { title: string; steps: string[] };
  en: { title: string; steps: string[] };
}

// One process diagram per case section. Sections are shared across every case
// (Contexto, Atuação, Operação, Desafio, Processo, Solução, Resultados,
// Comentários), so the SAME section title always maps to the SAME diagram.
const CASE_PROCESSES: Record<string, CaseProcessDef[]> = {
  L2: [
    {
      sections: ["atuacao", "contribution"],
      icon: Compass,
      pt: { title: "Jornada de descobrimento", steps: ["Ouvir as pessoas", "Entender o contexto", "Mapear jornadas", "Identificar lacunas", "Retomar conversas", "Fundamentar decisões"] },
      en: { title: "Discovery journey", steps: ["Listen to people", "Understand context", "Map journeys", "Identify gaps", "Revisit conversations", "Ground decisions"] },
    },
    {
      sections: ["operacao", "operation"],
      icon: Route,
      pt: { title: "Desenho da experiência", steps: ["Partir das jornadas", "Organizar informações", "Desenhar caminhos", "Discutir alternativas", "Criar consistência", "Prototipar"] },
      en: { title: "Experience design", steps: ["Start with journeys", "Organize information", "Design paths", "Discuss alternatives", "Build consistency", "Prototype"] },
    },
    {
      sections: ["desafio", "challenge"],
      icon: Radio,
      pt: { title: "Pesquisa de conectividade", steps: ["Investigar o uso", "Perceber limitações", "Rever premissas", "Considerar o histórico", "Dar contexto ao dado", "Apoiar a interpretação"] },
      en: { title: "Connectivity research", steps: ["Explore usage", "Recognize constraints", "Revisit assumptions", "Consider history", "Contextualize data", "Support interpretation"] },
    },
    {
      sections: ["processo", "process"],
      icon: RefreshCw,
      pt: { title: "Validação e implementação", steps: ["Apresentar protótipos", "Escutar feedback", "Refinar a experiência", "Preparar handoff", "Acompanhar construção", "Aprender com o uso"] },
      en: { title: "Validation and implementation", steps: ["Present prototypes", "Listen to feedback", "Refine the experience", "Prepare handoff", "Follow development", "Learn from usage"] },
    },
  ],
  L3: [
    {
      sections: ["atuacao", "contribution"],
      icon: Target,
      pt: { title: "Design e gestão de produto", steps: ["Assumir o redesign", "Decidir o roadmap", "Definir critérios", "Alinhar liderança", "Cuidar dos clientes", "Priorizar valor"] },
      en: { title: "Product design and management", steps: ["Own the redesign", "Decide the roadmap", "Define criteria", "Align leadership", "Handle clients", "Prioritize value"] },
    },
    {
      sections: ["operacao", "operation"],
      icon: Layers3,
      pt: { title: "Jornadas dos usuários", steps: ["Mapear os perfis", "Entender necessidades", "Organizar informações", "Conectar contextos", "Desenhar caminhos", "Preservar o que funciona"] },
      en: { title: "User journeys", steps: ["Map the profiles", "Understand needs", "Organize information", "Connect contexts", "Design paths", "Preserve what works"] },
    },
    {
      sections: ["desafio", "challenge"],
      icon: ListChecks,
      pt: { title: "Análise dos fluxos de trabalho", steps: ["Ouvir as reclamações", "Entender os fluxos", "Enxergar a inconsistência", "Questionar o modelo", "Buscar um denominador", "Definir princípios"] },
      en: { title: "Workflow analysis", steps: ["Listen to complaints", "Understand the flows", "See the inconsistency", "Question the model", "Find common ground", "Set principles"] },
    },
    {
      sections: ["processo", "process"],
      icon: Workflow,
      pt: { title: "Pesquisa e priorização", steps: ["Pesquisar concorrentes", "Entrevistar usuários", "Analisar os dados", "Prototipar e observar", "Pontuar o valor", "Decidir o que entra"] },
      en: { title: "Research and prioritisation", steps: ["Research competitors", "Interview users", "Analyse the data", "Prototype and observe", "Score the value", "Decide what ships"] },
    },
    {
      sections: ["solucao", "solution"],
      icon: Tags,
      pt: { title: "Implementação das soluções", steps: ["Taguear os dados", "Filtrar e agrupar", "Abrir a inscrição", "Integrar o painel", "Construir o design system", "Testar em POC"] },
      en: { title: "Solution implementation", steps: ["Tag the data", "Filter and group", "Open the sign-up", "Integrate the dashboard", "Build the design system", "Test in POC"] },
    },
  ],
  L4: [
    {
      sections: ["atuacao", "contribution"],
      icon: Compass,
      pt: { title: "Jornada de descobrimento", steps: ["Definir o problema", "Pesquisar similares", "Entrevistar usuários", "Organizar os dados", "Prototipar", "Testar e ajustar"] },
      en: { title: "Discovery journey", steps: ["Frame the problem", "Research similars", "Interview users", "Organize the data", "Prototype", "Test and adjust"] },
    },
    {
      sections: ["operacao", "operation"],
      icon: Layers3,
      pt: { title: "Jornadas de tratamento", steps: ["Mapear pacientes", "Mapear fisioterapeutas", "Entender o fluxo", "Definir Jobs to be Done", "Desenhar para os dois", "Cuidado no centro"] },
      en: { title: "Treatment journeys", steps: ["Map patients", "Map physiotherapists", "Understand the flow", "Define Jobs to be Done", "Design for both", "Care at the centre"] },
    },
    {
      sections: ["desafio", "challenge"],
      icon: HeartPulse,
      pt: { title: "Dificuldades no tratamento em casa", steps: ["Entender a rotina", "Ouvir o medo", "Ver a correria", "Observar o uso do vídeo", "Reformular o problema", "Priorizar o essencial"] },
      en: { title: "Challenges with treatment at home", steps: ["Understand the routine", "Hear the fear", "See the rush", "Observe video usage", "Reframe the problem", "Prioritize the essentials"] },
    },
    {
      sections: ["processo", "process"],
      icon: Search,
      pt: { title: "Investigação, estruturação, prototipagem", steps: ["Pesquisa de mesa", "Entrevistas", "Análise e contexto", "Ideação e documentação", "Experimentação", "Prototipagem"] },
      en: { title: "Investigate, structure, prototype", steps: ["Desk research", "Interviews", "Analysis and context", "Ideation and docs", "Experimentation", "Prototyping"] },
    },
    {
      sections: ["solucao", "solution"],
      icon: Smartphone,
      pt: { title: "Design do produto", steps: ["Lembretes na rotina", "Player mãos livres", "Painel do fisioterapeuta", "Design system acessível", "Identidade visual", "Entrega"] },
      en: { title: "Product design", steps: ["Reminders in routine", "Hands-free player", "Physiotherapist panel", "Accessible design system", "Visual identity", "Delivery"] },
    },
  ],
  L9: [
    {
      sections: ["atuacao", "contribution"],
      icon: Compass,
      pt: { title: "Design e acompanhamento das entregas", steps: ["Entender a política", "Traduzir em fluxos", "Prototipar", "Validar", "Fazer o handoff", "Acompanhar a entrega"] },
      en: { title: "Design and delivery follow-up", steps: ["Understand the policy", "Translate into flows", "Prototype", "Validate", "Hand off", "Follow delivery"] },
    },
    {
      sections: ["operacao", "operation"],
      icon: Layers3,
      pt: { title: "Jornadas de viagem", steps: ["Mapear o viajante", "Mapear o aprovador", "Mapear o gestor", "Entender as regras", "Desenhar para os três", "Controlar sem travar"] },
      en: { title: "Travel journeys", steps: ["Map the traveller", "Map the approver", "Map the manager", "Understand the rules", "Design for all three", "Control without blocking"] },
    },
    {
      sections: ["desafio", "challenge"],
      icon: ClipboardCheck,
      pt: { title: "Regras de negócio e autonomia", steps: ["Listar as regras", "Reduzir a complexidade", "Priorizar decisões", "Revisar os fluxos", "Ajustar", "Simplificar"] },
      en: { title: "Business rules and autonomy", steps: ["List the rules", "Reduce complexity", "Prioritise decisions", "Review the flows", "Adjust", "Simplify"] },
    },
    {
      sections: ["processo", "process"],
      icon: LayoutDashboard,
      pt: { title: "Discovery e quatro frentes", steps: ["Discovery", "Quatro frentes", "Protótipos", "Validação", "Sprints", "Handoff"] },
      en: { title: "Discovery and four fronts", steps: ["Discovery", "Four fronts", "Prototypes", "Validation", "Sprints", "Handoff"] },
    },
    {
      sections: ["solucao", "solution"],
      icon: Plane,
      pt: { title: "Funcionalidades do OBT", steps: ["Busca e reserva", "Aprovações", "Bilhetes não voados", "Indicadores", "IA em beta", "Relatórios"] },
      en: { title: "OBT features", steps: ["Search and booking", "Approvals", "Unflown tickets", "Analytics", "AI in beta", "Reports"] },
    },
  ],
};

export function CaseProcess({
  lineId,
  section,
  lang,
}: {
  lineId: string;
  section: string;
  lang: "pt" | "en";
}) {
  const process = CASE_PROCESSES[lineId]?.find((p) => p.sections.includes(section));
  if (!process) return null;
  const copy = process[lang];
  const Icon = process.icon;
  return (
    <figure className="case-process">
      <figcaption><Icon size={18} aria-hidden="true" /><span>{copy.title}</span></figcaption>
      <ol>{copy.steps.map((step, i) => <li key={step}><span className="case-process-number">{String(i + 1).padStart(2, "0")}</span><span>{step}</span>{i < copy.steps.length - 1 && <ArrowRight size={14} className="case-process-arrow" aria-hidden="true" />}</li>)}</ol>
    </figure>
  );
}
