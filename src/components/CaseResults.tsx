import { Award, BellRing, CirclePlay, Clock, FlaskConical, LayoutDashboard, Smile, Tags, Timer, UserPlus, Wrench, Zap, type LucideIcon } from "lucide-react";

const results: Record<string, Record<"pt" | "en", [string, string][]>> = {
  L2: {
    pt: [["35%", "menos tempo de máquinas paradas"], ["~35%", "menos manutenções perdidas"], ["+3.000", "alertas gerados"], ["mais satisfação", "percebida entre os colaboradores da Tracbel"]],
    en: [["35%", "less equipment downtime"], ["~35%", "fewer missed maintenance tasks"], ["3,000+", "alerts generated"], ["higher satisfaction", "noticed among Tracbel employees"]],
  },
  L3: {
    pt: [["50%", "dos projetos passaram a usar a inscrição simplificada"], [">70%", "de adesão às tags"], [">80%", "dos clientes adotaram o painel de inovação"], ["~35%", "menos tempo para aprovar após o redesign"]],
    en: [["50%", "of projects adopted simplified sign-up"], [">70%", "adoption of tags"], [">80%", "of clients adopted the innovation dashboard"], ["~35%", "less time to approve after the redesign"]],
  },
  L4: {
    pt: [["protótipo", "em alta fidelidade como entrega final"], ["player ajustado", "a partir das dificuldades observadas nos testes"], ["aprovado", "pela Unimed"]],
    en: [["prototype", "in high fidelity as the final deliverable"], ["revised player", "based on difficulties observed during testing"], ["approved", "by Unimed"]],
  },
  L9: {
    pt: [["60×", "mais velocidade nas aprovações após a implementação do fluxo pelo WhatsApp"]],
    en: [["60×", "faster approvals after the WhatsApp approval flow was implemented"]],
  },
};

// One icon per result, in the same order as the entries above.
const icons: Record<string, LucideIcon[]> = {
  L2: [Timer, Wrench, BellRing, Smile],
  L3: [UserPlus, Tags, LayoutDashboard, Clock],
  L4: [FlaskConical, CirclePlay, Award],
  L9: [Zap],
};

export function CaseResults({ lineId, lang }: { lineId: string; lang: "pt" | "en" }) {
  const items = results[lineId]?.[lang];
  if (!items) return null;
  return <div className={`case-results-grid${items.length === 1 ? " case-results-grid--single" : ""}`}>
    {items.map(([value, description], index) => {
      const Icon = icons[lineId]?.[index];
      return <p key={description} className="case-result">
        {Icon && <Icon className="case-icon case-result-icon" strokeWidth={1.5} aria-hidden="true" focusable="false" />}
        <strong className={value.length > 9 ? "case-result-word" : undefined}>{value}</strong>{" "}<span>{description}</span>
      </p>;
    })}
  </div>;
}
