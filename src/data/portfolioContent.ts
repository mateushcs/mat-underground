// ============================================================================
// CONTEUDO DO PORTFOLIO - editavel pelo Mat.
// ----------------------------------------------------------------------------
// Cada estacao e uma linha (L1...L8). O site usa apenas portugues e ingles.
// Tudo aqui tambem alimenta o Modo leitura (/leitura).
// ============================================================================

export type ContentLang = "pt" | "en";

export interface StationLink {
  label: string;
  url: string;
}

export type StationMedia =
  | {
      type: "spotify";
      title: string;
      src: string;
    }
  | {
      type: "film";
      title: string;
      meta: string;
      description: string;
      url: string;
      image: string;
      imageAlt: string;
    }
  | {
      type: "book";
      title: string;
      meta: string;
      description: string;
      url: string;
    };

export interface StationContent {
  title: string;
  role: string;
  body: string[];
  links?: StationLink[];
  media?: StationMedia[];
}

const musicEmbeds = {
  pt: [
    {
      type: "spotify" as const,
      title: "Find You",
      src: "https://open.spotify.com/embed/track/6xeyjWgntCN8UQKjAOzT7l?utm_source=generator&theme=0&si=23bb0f770c3e4bce",
    },
    {
      type: "spotify" as const,
      title: "Odsjaji",
      src: "https://open.spotify.com/embed/track/1NloZPigydBzWZe5tZIE66?utm_source=generator&theme=0&si=566f641ae4b24acb",
    },
    {
      type: "spotify" as const,
      title: "I Like You Best - Cover",
      src: "https://open.spotify.com/embed/track/7MAgib7aTXE2nKqRtGonpM?utm_source=generator&theme=0&si=5f38d4078e19448a",
    },
    {
      type: "spotify" as const,
      title: "Lara Kroft",
      src: "https://open.spotify.com/embed/track/7FQmCNBt5MgxNXSv2qhCzm?utm_source=generator&theme=0&si=8c3e1e96ad7241f6",
    },
    {
      type: "spotify" as const,
      title: "WHY NOW?",
      src: "https://open.spotify.com/embed/album/2qQU7mfSkbKAF5RJJUlgq5?utm_source=generator&theme=0&si=ee08029d8ac54dea",
    },
  ],
  en: [
    {
      type: "spotify" as const,
      title: "Find You",
      src: "https://open.spotify.com/embed/track/6xeyjWgntCN8UQKjAOzT7l?utm_source=generator&theme=0&si=23bb0f770c3e4bce",
    },
    {
      type: "spotify" as const,
      title: "Odsjaji",
      src: "https://open.spotify.com/embed/track/1NloZPigydBzWZe5tZIE66?utm_source=generator&theme=0&si=566f641ae4b24acb",
    },
    {
      type: "spotify" as const,
      title: "I Like You Best - Cover",
      src: "https://open.spotify.com/embed/track/7MAgib7aTXE2nKqRtGonpM?utm_source=generator&theme=0&si=5f38d4078e19448a",
    },
    {
      type: "spotify" as const,
      title: "Lara Kroft",
      src: "https://open.spotify.com/embed/track/7FQmCNBt5MgxNXSv2qhCzm?utm_source=generator&theme=0&si=8c3e1e96ad7241f6",
    },
    {
      type: "spotify" as const,
      title: "WHY NOW?",
      src: "https://open.spotify.com/embed/album/2qQU7mfSkbKAF5RJJUlgq5?utm_source=generator&theme=0&si=ee08029d8ac54dea",
    },
  ],
};

const recommendationMedia = {
  pt: [
    {
      type: "spotify" as const,
      title: "wildwoman",
      src: "https://open.spotify.com/embed/track/3nmHojsXc76NvGmpGsNGmi?utm_source=generator&si=b6d5f19c0a804a38",
    },
    {
      type: "spotify" as const,
      title: "Running Back To You",
      src: "https://open.spotify.com/embed/track/3o4mFQ6OMlAwxxjdvWSrPI?utm_source=generator&theme=0&si=b5291a69abdb481f",
    },
    {
      type: "spotify" as const,
      title: "Florescence",
      src: "https://open.spotify.com/embed/album/0MOWqwwatV0LXDxhBZg5qO?utm_source=generator&si=7fda829dabdc4914",
    },
    {
      type: "film" as const,
      title: "Minari",
      meta: "Lee Isaac Chung, 2020 - A24",
      description:
        "Um drama familiar pequeno no gesto e enorme no afeto, sobre pertencimento, trabalho e raiz.",
      url: "https://letterboxd.com/film/minari/",
      image: "https://upload.wikimedia.org/wikipedia/en/8/8a/Minari_%28film%29.png",
      imageAlt: "Poster do filme Minari",
    },
    {
      type: "film" as const,
      title: "Poetry",
      meta: "Lee Chang-dong, 2010 - Coreia do Sul",
      description:
        "Um filme de observação delicada sobre memória, linguagem, violência e a tentativa de encontrar beleza.",
      url: "https://letterboxd.com/film/poetry/",
      image:
        "https://upload.wikimedia.org/wikipedia/en/thumb/f/fe/Poetry_film_poster.jpg/250px-Poetry_film_poster.jpg",
      imageAlt: "Poster do filme Poetry",
    },
    {
      type: "book" as const,
      title: "Design como atitude",
      meta: "Alice Rawsthorn - Ubu Editora",
      description:
        "Design como prática crítica diante de desafios sociais, políticos e ecológicos.",
      url: "https://www.ubueditora.com.br/design-como-atitude.html",
    },
  ],
  en: [
    {
      type: "spotify" as const,
      title: "wildwoman",
      src: "https://open.spotify.com/embed/track/3nmHojsXc76NvGmpGsNGmi?utm_source=generator&si=b6d5f19c0a804a38",
    },
    {
      type: "spotify" as const,
      title: "Running Back To You",
      src: "https://open.spotify.com/embed/track/3o4mFQ6OMlAwxxjdvWSrPI?utm_source=generator&theme=0&si=b5291a69abdb481f",
    },
    {
      type: "spotify" as const,
      title: "Florescence",
      src: "https://open.spotify.com/embed/album/0MOWqwwatV0LXDxhBZg5qO?utm_source=generator&si=7fda829dabdc4914",
    },
    {
      type: "film" as const,
      title: "Minari",
      meta: "Lee Isaac Chung, 2020 - A24",
      description: "A quiet family drama about belonging, work and roots.",
      url: "https://letterboxd.com/film/minari/",
      image: "https://upload.wikimedia.org/wikipedia/en/8/8a/Minari_%28film%29.png",
      imageAlt: "Minari film poster",
    },
    {
      type: "film" as const,
      title: "Poetry",
      meta: "Lee Chang-dong, 2010 - South Korea",
      description:
        "A delicate film about memory, language, violence and the attempt to find beauty.",
      url: "https://letterboxd.com/film/poetry/",
      image:
        "https://upload.wikimedia.org/wikipedia/en/thumb/f/fe/Poetry_film_poster.jpg/250px-Poetry_film_poster.jpg",
      imageAlt: "Poetry film poster",
    },
    {
      type: "book" as const,
      title: "Design como atitude",
      meta: "Alice Rawsthorn - Ubu Editora",
      description: "Design as a critical practice for social, political and ecological challenges.",
      url: "https://www.ubueditora.com.br/design-como-atitude.html",
    },
  ],
};

export const portfolioContent: Record<string, Record<ContentLang, StationContent>> = {
  L1: {
    pt: {
      title: "Sobre mim",
      role: "Product designer & manager — Fortaleza",
      body: [
        "oie! hi! 你好 ！me chamo mateus (mas prefiro mat!) e sou um designer & manager de produto aqui de fortalcity (e do resto do mundo, se for remoto!).",
        "tenho mais de 5 anos desenhando produtos digitais /do discovery até a entrega/. gosto de transformar dados, desejos e destinos (os DDD) em produtos, sempre equilibrando a estratégia, negócios e a visão do usuário e com muito bom humor! ha!",
        "tenho também experiência como Product Manager em projetos que demandam relacionamento direto com clientes, escrita de histórias de usuário, priorização de roadmap e análise de dados.",
        "já trabalhei em SaaS B2B, Agritech, Healthtech e inovação aberta, e cada setor me ensinou algo diferente. também sou produtor musical nas horas vagas!",
      ],
    },
    en: {
      title: "About me",
      role: "Product designer & manager — Fortaleza",
      body: [
        "oie! hi! 你好! i'm mateus (but i prefer mat!), a product designer & manager from fortalcity — and the rest of the world, if it's remote!",
        "i've spent 5+ years designing digital products, from discovery to delivery. i like turning data, desires and directions (the three Ds) into products, always balancing strategy, business and the user's view — and with plenty of good humor! ha!",
        "i also work as a Product Manager on client-facing projects: writing user stories, prioritizing roadmaps and reading product data.",
        "i've worked across B2B SaaS, agritech, healthtech and open innovation, and each field taught me something different. i also produce music in my spare time!",
      ],
    },
  },

  L2: {
    pt: {
      title: "Uptime Center",
      role: "Tracbel — monitoramento preditivo",
      body: [
        "Designer único numa plataforma de monitoramento preditivo para o agronegócio: como automatizei processos com dados.",
        "## CONTEXTO",
        "A Tracbel queria utilizar os dados de telemetria de frotas para automatizar o processo de identificação e notificação de manutenções. O Uptime Center é uma plataforma para monitoramento preditivo, diagnóstico remoto e planejamento de serviço para equipamentos multimarca no agronegócio.",
        "Entrei como único designer de uma squad com um PM, três devs e stakeholders diretos da Tracbel. O produto foi apresentado na Agrishow 2023, a maior feira do setor na América Latina!",
        "## O PROBLEMA",
        "A equipe de pós-venda precisava monitorar frotas inteiras de múltiplas marcas, o que exige ação agora x o que pode esperar pra um momento posterior. Organização e monitoramento manual de múltiplos clientes, que trabalham em diferentes condições.",
        "Além disso, a plataforma deveria servir perfis muito diferentes ao mesmo tempo. O especialista técnico, o coordenador que gerencia disponibilidade de equipe, os gestores e técnicos de campo.",
        "[[img:/case-studies/uptime-login.png|Tela de login do Uptime Center]]",
        "## MERGULHO NO DOMÍNIO",
        "Participei de sessões de discovery com os stakeholders da Tracbel para entender como a equipe priorizava alertas na prática, todo o fluxo de operação, detalhes, exceções e como o sistema poderia apoiar o processo deles. Conversei com consultores, gestores, técnicos, mecânicos e clientes para entender todo o processo de ponta a ponta.",
        "Hoje sei um tantinho sobre o mundo das máquinas amarelas. Tudo!",
        "## DESIGN SYSTEM",
        "Como designer único, construí o Design System em paralelo com o produto. Sem isso, cada tela nova seria uma decisão do zero, sempre alinhado com o time de devs.",
        "Os componentes precisavam funcionar para múltiplas marcas de equipamentos e em diferentes tamanhos de tela. A plataforma rodava tanto em desktop de escritório quanto em tablet no campo.",
        "[[img:/case-studies/uptime-control-room.png|Central de operação da Tracbel]]",
        "## HANDOFF",
        "Trabalhei junto dos devs durante todo o processo. Alinhava comportamento de componente em tempo real, tirava dúvida de interação na hora, e priorizava com o PM o que entrava em cada ciclo de release. Isso fez a fidelidade entre o protótipo e o produto final ser muito alta, além de ser uma filosofia minha de trabalho.",
        "## RESULTADO",
        "O Uptime Center foi lançado na Agrishow 2023. Passou a operar com a equipe de pós-venda da Tracbel no dia a dia. Alertas por severidade, diagnóstico remoto, planejamento de serviço e visão de frota multimarca numa interface coesa.",
        "Ser o único designer de uma squad te obriga a ser um ponto de conexão entre produto, negócio e engenharia. Você decide mais rápido, precisa comunicar melhor e não tem quem revise seu raciocínio antes de ir pro time. Isso acelera o crescimento de um jeito que colaborar em times grandes não acelera da mesma forma!",
        "[[img:/case-studies/uptime-signage.png|Placa Uptime Center sobre os monitores]]",
      ],
    },
    en: {
      title: "Uptime Center",
      role: "Tracbel — predictive monitoring",
      body: [
        "Sole designer on a predictive-monitoring platform for agribusiness: how I automated processes with data.",
        "## Context",
        "Tracbel wanted to use fleet telemetry data to automate the identification and notification of maintenance. Uptime Center is a platform for predictive monitoring, remote diagnostics and service planning for multi-brand agribusiness equipment.",
        "I joined as the only designer in a squad with a PM, three devs and direct Tracbel stakeholders. The product was presented at Agrishow 2023, the biggest fair in the sector in Latin America!",
        "## The problem",
        "The after-sales team needed to monitor whole fleets of multiple brands: what needs action now vs. what can wait. Manual organization and monitoring of many clients, all working in different conditions.",
        "On top of that, the platform had to serve very different profiles at once: the technical specialist, the coordinator managing team availability, the managers and the field technicians.",
        "[[img:/case-studies/uptime-login.png|Uptime Center login screen]]",
        "## Domain deep-dive",
        "I joined discovery sessions with Tracbel stakeholders to understand how the team prioritized alerts in practice — the whole operation flow, details, exceptions and how the system could support their process. I talked to consultants, managers, technicians, mechanics and clients to understand it end to end.",
        "Today I know a little something about the world of yellow machines. Everything!",
        "## Design system",
        "As the only designer, I built the Design System alongside the product. Without it, every new screen would be a decision from scratch — always aligned with the dev team. Components had to work across multiple equipment brands and screen sizes: the platform ran on office desktops and on field tablets.",
        "[[img:/case-studies/uptime-control-room.png|Tracbel operations room]]",
        "## Handoff",
        "I worked next to the devs the whole way. I aligned component behavior in real time, answered interaction questions on the spot and prioritized with the PM what went into each release cycle. That kept fidelity between prototype and final product very high — and it's a working philosophy of mine.",
        "## RESULT",
        "Uptime Center launched at Agrishow 2023 and became part of Tracbel's after-sales operation: severity-based alerts, remote diagnostics, service planning and a multi-brand fleet view in one coherent interface.",
        "Being the only designer in a squad forces you to be a connection point between product, business and engineering. You decide faster, communicate better and have no one to review your reasoning before it reaches the team. That accelerates growth in a way collaborating in big teams doesn't!",
        "[[img:/case-studies/uptime-signage.png|Uptime Center signage above the team monitors]]",
      ],
    },
  },

  L3: {
    pt: {
      title: "Solv",
      role: "Neo Ventures — SaaS B2B de inovação",
      body: [
        "Por anos, atuei como designer de produto e project manager de um SaaS B2B de inovação.",
        "## Contexto",
        "O Solv começou como software de inovação aberta: formulários, triagem de startups, avaliadores, white label. Com o tempo virou uma plataforma que cobre inovação interna, portfólio de projetos, melhoria contínua e um copiloto de IA. O produto cresceu. A experiência não acompanhou.",
        "Quando assumi a liderança do redesign, o Solv funcionava bem para quem já conhecia seus caminhos. Para quem chegava novo, ou para o cliente que queria enxergar valor estratégico na plataforma, havia fricção demais.",
        "## Papel duplo",
        "No Solv fiz as duas coisas em paralelo: conduzi o redesign de ponta a ponta e gerenciei o produto. Escrevi histórias de usuário, critérios de aceite e regras de negócio. Alinhei roadmap com a liderança da Neo Ventures. Gerenciei o relacionamento direto com clientes durante as validações.",
        "## Diagnóstico",
        "O Solv era um sistema grande, complexo, com inúmeras features, tipos de clientes, casos de uso e cenários. O maior desafio era fazer com que todos esses caminhos andassem em harmonia para todos os seus diferentes tipos de usuários. Todas as decisões sempre levavam em consideração inúmeras variáveis.",
        "## Resultado",
        "O Solv hoje é referência no segmento de gestão da inovação. Clientes como Samarco, Nexa, Andrade Gutierrez, Vale e CCEE usam o produto. O Design System acelerou o ciclo de entrega de novas features e eliminou a inconsistência visual que tinha se acumulado ao longo dos anos.",
      ],
    },
    en: {
      title: "Solv",
      role: "Neo Ventures — B2B innovation SaaS",
      body: [
        "For years I worked as product designer and project manager of a B2B innovation SaaS.",
        "## Context",
        "Solv started as open-innovation software: forms, startup screening, reviewers, white label. Over time it became a platform covering internal innovation, project portfolios, continuous improvement and an AI copilot. The product grew. The experience didn't keep up.",
        "When I took over the redesign, Solv worked well for people who already knew its paths. For newcomers, or for the client trying to see strategic value in the platform, there was too much friction.",
        "## Double role",
        "At Solv I did both in parallel: I led the end-to-end redesign and managed the product. I wrote user stories, acceptance criteria and business rules. I aligned the roadmap with Neo Ventures leadership. I managed direct client relationships during validations.",
        "## Diagnosis",
        "Solv was a large, complex system with countless features, client types, use cases and scenarios. The biggest challenge was making all those paths move in harmony for its different kinds of users. Every decision always weighed countless variables.",
        "## Result",
        "Solv is now a reference in innovation management. Clients such as Samarco, Nexa, Andrade Gutierrez, Vale and CCEE use the product. The Design System accelerated the delivery cycle of new features and eliminated the visual inconsistency that had piled up over the years.",
      ],
    },
  },

  L4: {
    pt: {
      title: "Terapio",
      role: "Healthtech — TIM AWC",
      body: [
        "UX de saúde num programa de aceleração: como projetei um app de fisioterapia de ponta a ponta.",
        "## Contexto",
        "Em 2021 entrei no programa de aceleração TIM AWC com o Terapio, uma healthtech de fisioterapia. A proposta era conectar pacientes com fisioterapeutas via telemedicina e ajudar quem precisava continuar o tratamento em casa, fora do consultório.",
        "Fui responsável do design do produto do começo ao fim, auxiliando no planejamento e entrevistas, apresentação de evolução do projeto, organização de requisitos e features até a prototipação final.",
        "## O que a pesquisa me mostrou",
        "Conversei com pacientes e fisioterapeutas. A maioria das pessoas não fazia os exercícios em casa porque simplesmente esquecia, não conseguia encaixar na rotina ou tinha insegurança em realizar sozinho os exercícios, e as demonstrações em papeis que os fisioterapeuta as vezes davam não eram o bastante para ajudar com a insegurança de se machucar ou piorar a condição tentando fazer os exercícios sozinhos, mesmo sendo muito necessário.",
        "Do lado do terapeuta, o problema era outro. Ajustar um plano de exercício no meio da semana demorava mais do que deveria. Além disso, quando o paciente não realizava os exercícios em casa, com regularidade, o tratamento era prejudicado.",
        "Uma coisa que me chamou atenção nos testes foi que vídeos demonstrativos geravam muita confiança no paciente, mas era difícil quando o paciente precisava segurar o celular e fazer o exercício ao mesmo tempo.",
        "## Decisões",
        "Primeiro, projeitei o sistema de lembretes para que ele fizesse sentido dentro da rotina de cada paciente. Segundo, redesenhei o player de vídeo para que o paciente conseguisse alternar entre assistir e executar sem segurar o celular o tempo todo. Controles acessíveis, barra de progresso visível em tela pequena. Terceiro, simplifiquei o painel do fisioterapeuta. O que levava vários passos virou uma interface de edição mais simples, adaptável para o trabalho do profissional.",
        "## Resultado e aprendizado",
        "Saímos com identidade visual própria, fluxos validados com usuários e protótipo em alta fidelidade dentro do prazo da aceleração. Quando o usuário tem dor física, limite de mobilidade ou baixa energia, a interface precisa trabalhar por ele.",
        "Esse projeto foi importante para entender o contexto em que os produtos digitais são utilizados, por exemplo, nesse caso, muito usuários só podiam manusear o celular com uma mão só, ou não tinham local para deixar o celular apoiado enquanto ficava vendo e tentando fazer os exercícios.",
      ],
      links: [
        {
          label: "Ver projeto no Behance",
          url: "https://www.behance.net/gallery/146176583/Terapio-App-de-Fisioterapia",
        },
      ],
    },
    en: {
      title: "Terapio",
      role: "Healthtech — TIM AWC",
      body: [
        "Health UX inside an acceleration program: how I designed a physiotherapy app end to end.",
        "## Context",
        "In 2021 I joined the TIM AWC acceleration program with Terapio, a physiotherapy healthtech. The idea was to connect patients with physiotherapists via telemedicine and help those who needed to continue treatment at home, away from the clinic.",
        "I owned product design from start to finish, supporting planning and interviews, progress presentations, requirements and feature organization, up to the final prototype.",
        "## What research showed me",
        "I talked to patients and physiotherapists. Most people didn't do their exercises at home because they simply forgot, couldn't fit them into their routine, or felt unsure doing them alone — and the paper demos physiotherapists sometimes handed out weren't enough to ease the fear of getting hurt or making things worse.",
        "On the therapist's side, the problem was different: adjusting an exercise plan mid-week took longer than it should. And when patients didn't exercise regularly at home, treatment suffered.",
        "One thing stood out in testing: demo videos built a lot of confidence, but it was hard when the patient had to hold the phone and do the exercise at the same time.",
        "## Decisions",
        "First, I designed the reminder system to make sense within each patient's routine. Second, I redesigned the video player so patients could switch between watching and doing without holding the phone the whole time — accessible controls, a progress bar visible on small screens. Third, I simplified the physiotherapist panel: what took several steps became a simpler editing interface that adapts to the professional's work.",
        "## Result and takeaway",
        "We left with our own visual identity, user-validated flows and a high-fidelity prototype within the acceleration deadline. When users have physical pain, limited mobility or low energy, the interface has to work for them.",
        "This project was key to understanding the context where digital products are actually used: many users could only handle the phone with one hand, or had nowhere to prop it while watching and trying to exercise.",
      ],
      links: [
        {
          label: "View project on Behance",
          url: "https://www.behance.net/gallery/146176583/Terapio-App-de-Fisioterapia",
        },
      ],
    },
  },

  L5: {
    pt: {
      title: "Músicas",
      role: "Produção musical — FL Studio",
      body: [
        "Gosto de produzir músicas por aí, e se você é cantor/compositor, tô sempre disponível pra fazer um som!",
        "Se quiser dar uma ouvidinha:",
      ],
      media: musicEmbeds.pt,
    },
    en: {
      title: "Music",
      role: "Music production — FL Studio",
      body: [
        "I like making music here and there, and if you're a singer/songwriter, I'm always up for making a track!",
        "If you want a little listen:",
      ],
      media: musicEmbeds.en,
    },
  },

  L6: {
    pt: {
      title: "Recomendações",
      role: "Músicas, filmes e livros",
      body: [
        "Aqui vão umas musiquinhas, filmes e livros que eu acho que todo mundo deveria conhecer! :o",
      ],
      media: recommendationMedia.pt,
    },
    en: {
      title: "Recommendations",
      role: "Music, films and books",
      body: ["Here are some little songs, films and books I think everyone should know! :o"],
      media: recommendationMedia.en,
    },
  },

  L7: {
    pt: {
      title: "Créditos",
      role: "Colofão e bastidores",
      body: [
        "ao meu amigo pedro, por me apresentar o apple sharp!",
        "Ao apple-sharp, pois foi o mecanismo utilizado para gerar os modelos 3D dos metrôs.",
        "Ao incrível livro One Metro World e ao trabalho do Jug Cerovic, que documentou, organizou e criou um sistema de design para mapas de metrô incrível.",
        "ao claudinho e o codex!",
      ],
      links: [
        {
          label: "One Metro World",
          url: "https://www.inat.fr/files/One_Metro_World_Jug_Cerovic.pdf",
        },
      ],
    },
    en: {
      title: "Credits",
      role: "Colophon & behind the scenes",
      body: [
        "to my friend pedro, for introducing me to apple sharp!",
        "to apple-sharp, the engine used to generate the 3d models of the metros.",
        "to the incredible book one metro world and jug cerovic's work, which documented, organized and created a design system for building metro map systems — incredible.",
        "to little claude and codex!",
      ],
      links: [
        {
          label: "One Metro World",
          url: "https://www.inat.fr/files/One_Metro_World_Jug_Cerovic.pdf",
        },
      ],
    },
  },

  L8: {
    pt: {
      title: "Ative sua linha",
      role: "Contato",
      body: [
        "Quer conversar sobre produto, música, pesquisa, design system ou uma ideia meio torta que ainda precisa ganhar trilho? Me chama.",
      ],
      links: [{ label: "Abrir formulário de contato", url: "/?contact=1" }],
    },
    en: {
      title: "Activate your line",
      role: "Contact",
      body: [
        "Want to talk about product, music, research, design systems or a half-formed idea that still needs a route? Reach out.",
      ],
      links: [{ label: "Open contact form", url: "/?contact=1" }],
    },
  },
};

export const readingIntro: Record<ContentLang, { heading: string; tagline: string; back: string }> =
  {
    pt: {
      heading: "MATS Subway - portfolio de Mat",
      tagline:
        "Versão em texto, acessível e bilíngue do mapa. Ideal para leitores de tela, leitura linear e baixa carga visual.",
      back: "Voltar ao mapa",
    },
    en: {
      heading: "MATS Subway - Mat's portfolio",
      tagline:
        "An accessible bilingual text version of the map, made for screen readers, linear reading and lower visual load.",
      back: "Back to the map",
    },
  };

export const CONTENT_LINE_ORDER = ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"] as const;

export function getStationContent(lineId: string, lang: ContentLang): StationContent | undefined {
  return portfolioContent[lineId]?.[lang];
}

export function lineTitle(lineId: string, lang: ContentLang): string | undefined {
  return portfolioContent[lineId]?.[lang]?.title;
}
