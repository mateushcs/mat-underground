import { getStationContent as getBaseContent, type ContentLang, type StationContent } from "./portfolioContent";

// Case-only presentation. Kept outside the shared home/map configuration.
export const caseBriefs: Record<string, Record<ContentLang, { description: string; contribution: string; results: string }>> = {
  L2: {
    pt: { description: "Uma plataforma pra equipe de pós-venda da Tracbel acompanhar máquinas e organizar a manutenção preventiva.", contribution: "Fui o único designer: pesquisa, jornadas, fluxos, design system e acompanhamento da implementação, junto com o PM e os devs.", results: "35% menos tempo de máquinas paradas, cerca de 35% menos manutenções perdidas, mais de 3.000 alertas gerados e um aumento perceptível na satisfação dos colaboradores." },
    en: { description: "A platform for Tracbel's after-sales team to monitor equipment and organise preventive maintenance.", contribution: "I was the sole designer, covering research, journeys, flows, the design system and implementation follow-up with the PM and developers.", results: "35% less equipment downtime, around 35% fewer missed maintenance tasks, over 3,000 alerts generated and a noticeable improvement in employee satisfaction." },
  },
  L3: {
    pt: { description: "O Solv é um SaaS B2B da Neo Ventures que ajuda empresas a organizar programas, ideias e projetos de inovação.", contribution: "Atuei como designer e PM, conduzindo o redesign, o design system, as pesquisas e a priorização do roadmap com a liderança.", results: "50% dos projetos passaram a usar a inscrição simplificada, as tags tiveram mais de 70% de adesão, o painel chegou a mais de 80% dos clientes e o tempo de aprovação caiu cerca de 35%." },
    en: { description: "Solv is Neo Ventures' B2B SaaS for organising innovation programmes, ideas and projects.", contribution: "As designer and PM, I led the redesign, design system, research and roadmap prioritisation with leadership.", results: "50% of projects adopted simplified sign-up, tags reached over 70% adoption, the dashboard reached over 80% of clients and approval time fell by around 35%." },
  },
  L4: {
    pt: { description: "Um projeto de fisioterapia à distância, com um app pro paciente e outro pro fisioterapeuta acompanharem o tratamento.", contribution: "Cuidei da pesquisa, dos fluxos, dos protótipos, dos testes e da identidade visual, numa equipe de três pessoas.", results: "Protótipo em alta fidelidade como entrega final, com o player ajustado a partir da pesquisa, e aprovação do projeto pela Unimed." },
    en: { description: "A remote physiotherapy project, with separate apps for patients and physiotherapists to follow treatment.", contribution: "I handled research, flows, prototypes, testing and visual identity in a three-person team.", results: "A high-fidelity prototype as the final deliverable, with research-led changes to the video player, and approval by Unimed." },
  },
  L9: {
    pt: { description: "Uma plataforma de viagens corporativas pra buscar, reservar e aprovar viagens, respeitando as regras de cada empresa.", contribution: "Desenhei os fluxos e as interfaces do discovery ao handoff, em parceria com o PM, os stakeholders e os devs.", results: "Aprovações 60 vezes mais rápidas após a implementação do fluxo de aprovação pelo WhatsApp." },
    en: { description: "A corporate travel platform for searching, booking and approving trips within each company's rules.", contribution: "I designed flows and interfaces from discovery to handoff, working with the PM, stakeholders and developers.", results: "Approvals became 60 times faster after the WhatsApp approval flow was implemented." },
  },
};

const about: Record<ContentLang, string[]> = {
  pt: [
    "Oiê! Hi! 你好！Eu sou o Mateus, mas pode me chamar de Mat. Eu trabalho com design e gestão de produto aqui de Fortalcity, e do resto do mundo também quando dá pra ser remoto. Já passei por projetos em áreas como SaaS B2B, agritech, healthtech e inovação aberta, e cada área me ensinou uma coisa diferente. Ah, e quando sobra um tempo, eu também produzo música.",
    "Eu comecei no mundo do design ainda adolescente, fazendo sites e blogs pra mim e pras pessoas das comunidades de que eu participava. Foi minha primeira experiência trabalhando com ‘cliente’, diga-se de passagem. Um tempo depois, fiz minha graduação na Universidade Federal do Ceará, e atualmente curso um MBA em Design de Interação na Anhanguera.",
    "Já faz mais de cinco anos que eu desenho produto digital de ponta a ponta, do discovery ao handoff pros devs. Gosto de entender o que as pessoas precisam, o que o negócio quer e o que dá pra construir, e ir ajustando essas coisas junto com o time. De bom humor, sempre que possível.",
    "Nesse tempo, construí um design system do zero, com foco em tokenização e diretrizes de uso, e conduzi pesquisas tanto pra orientar a estratégia quanto pra melhorar a usabilidade de produtos SaaS B2B. Como PM, também cuidei de priorização, roadmap, acompanhamento de métricas e alinhamento com liderança e marketing.",
    "E teve resultado: no Uptime Center, o tempo de máquinas paradas caiu 35% e as manutenções perdidas diminuíram cerca de 35%. Na Tour House, o fluxo pelo WhatsApp deixou as aprovações 60 vezes mais rápidas. No Solv, vi as soluções que desenhamos ganharem adesão e o tempo de aprovação cair cerca de 35%. Gosto de acompanhar essa parte também, porque é quando dá pra ver o que mudou na rotina de quem usa.",
    "## Meu processo",
    "Ué, achou que teria um fluxograma bonitinho aqui? Ha! Meu processo depende do projeto.",
    "Tem projeto em que a gente tem liberdade pra falar com usuários e fazer entrevistas, e tem projeto em que não. Alguns permitem testar, ajustar e testar de novo; outros têm um prazo curtinho pra entrega. Alguns são mais focados no negócio, outros nas necessidades de quem usa.",
    "Então meu processo é adaptável. Faz parte do design entender qual abordagem faz sentido pra cada projeto e cada produto, considerando o contexto, o time e o tempo que a gente tem. Eu vou escolhendo os caminhos a partir disso.",
  ],
  en: [
    "Oiê! Hi! 你好! I'm Mateus, but you can call me Mat. I work in product design and management from Fortaleza, and anywhere else when remote work makes it possible. I've worked on projects in areas such as B2B SaaS, agritech, healthtech and open innovation, and each taught me something different. Oh, and when I have some spare time, I also make music.",
    "I started designing as a teenager, making websites and blogs for myself and people in the communities I belonged to. My first experience working with ‘clients’, actually. Later I graduated from the Federal University of Ceará, and I'm currently taking an MBA in Interaction Design at Anhanguera.",
    "I've been designing digital products end to end for over five years, from discovery to developer handoff. I like understanding what people need, what the business wants and what we can build, then working through it with the team. Preferably in a good mood.",
    "Along the way, I built a design system from scratch with tokens and usage guidelines, and led research for strategy and usability improvements in B2B SaaS. As a PM, I also worked on prioritisation, roadmaps, metrics and alignment with leadership and marketing.",
    "And there were results: Uptime Center saw 35% less equipment downtime and around 35% fewer missed maintenance tasks. At Tour House, WhatsApp approvals became 60 times faster. At Solv, the solutions we designed gained adoption and approval time fell by around 35%. I like following this part too, because it shows what actually changed in people's routines.",
    "## My process",
    "Oh, were you expecting a neat little flowchart here? Ha! My process depends on the project.",
    "Some projects give us room to speak to users and run interviews; others don't. Some allow us to test, adjust and test again, while others have a very short deadline. Some focus more on the business, others on user needs.",
    "So my process adapts. Part of design is working out which approach fits each project and product, considering the context, the team and the time we have. That's how I choose what to do next.",
  ],
};

const covers: Record<string, string> = { L3: "solv-editorial.webp", L4: "terapio-editorial.webp", L9: "tour-house-editorial.webp" };
export function getStationContent(lineId: string, lang: ContentLang): StationContent | undefined {
  const base = getBaseContent(lineId, lang);
  if (!base) return undefined;
  if (lineId === "L1") return { ...base, body: about[lang], summary: lang === "pt" ? "Design, produto, pesquisa e umas músicas no meio do caminho." : "Design, product, research and a few songs along the way." };
  if (!covers[lineId]) return base;
  return { ...base, summary: caseBriefs[lineId][lang].description, cover: { src: `/case-studies/covers/${covers[lineId]}`, alt: lang === "pt" ? `Capa ilustrativa do projeto ${base.title}` : `Illustrative cover for ${base.title}` } };
}
