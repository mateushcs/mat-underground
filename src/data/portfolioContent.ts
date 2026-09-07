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

export interface StationHeader {
  /** company Mateus worked at (or through) */
  company: string;
  /** end client, when different from the company (omit for own products) */
  client?: string;
  /** e.g. "out 2022 – jun 2023 · 9 meses" */
  period: string;
  /** Mateus's role on the project */
  role: string;
}

export interface StationContent {
  title: string;
  role: string;
  /** Project pages carry a small header block (client, company, duration, role). */
  header?: StationHeader;
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
        "em números: construí do zero um Design System com +30 componentes, entreguei +80 features em +80 sprints e conduzi +10 processos de discovery com usuários. tudo em SaaS B2B complexo, da pesquisa ao handoff.",
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
        "in numbers: i built a Design System from scratch with 30+ components, shipped 80+ features across 80+ sprints and ran 10+ discovery processes with users. all in complex B2B SaaS, from research to handoff.",
        "i also work as a Product Manager on client-facing projects: writing user stories, prioritizing roadmaps and reading product data.",
        "i've worked across B2B SaaS, agritech, healthtech and open innovation, and each field taught me something different. i also produce music in my spare time!",
      ],
    },
  },

  L2: {
    pt: {
      title: "Uptime Center",
      role: "Tracbel — monitoramento preditivo",
      header: {
        company: "Neo Ventures",
        client: "Tracbel",
        period: "9 meses",
        role: "Product Designer (designer único)",
      },
      body: [
        "## Contexto",
        "A Tracbel queria usar a telemetria das frotas para automatizar a identificação e a notificação de manutenções. O Uptime Center faz monitoramento preditivo, diagnóstico remoto e planejamento de serviço para equipamentos multimarca (Volvo, Tigercat e outros), servindo perfis bem diferentes ao mesmo tempo: especialista técnico, coordenador, gestor e técnico de campo.",
        "Entrei como único designer numa squad com PM, 3 devs e stakeholders da Tracbel. Lançado na Agrishow 2023.",
        "[[img:/case-studies/uptime-login.png|Tela de login do Uptime Center]]",
        "## Ações",
        "Conduzi o discovery com consultores, gestores, técnicos e mecânicos para entender como a equipe priorizava alertas na prática — o fluxo real, as exceções e onde o sistema podia apoiar.",
        "Construí o Design System em paralelo ao produto: componentes que funcionam para múltiplas marcas e em diferentes telas, do desktop do escritório ao tablet no campo. Trabalhei lado a lado com os devs no handoff, alinhando o comportamento de cada componente em tempo real.",
        "[[img:/case-studies/uptime-control-room.png|Central de operação da Tracbel]]",
        "## Resultados e conclusões",
        "O Uptime Center entrou na operação de pós-venda da Tracbel: alertas por severidade, diagnóstico remoto, planejamento de serviço e visão de frota multimarca numa interface coesa.",
        "Ser o único designer da squad me obrigou a ser o ponto de conexão entre produto, negócio e engenharia — decidir rápido, comunicar melhor e sustentar a fidelidade entre protótipo e produto final.",
        "[[img:/case-studies/uptime-signage.png|Placa Uptime Center sobre os monitores]]",
      ],
    },
    en: {
      title: "Uptime Center",
      role: "Tracbel — predictive monitoring",
      header: {
        company: "Neo Ventures",
        client: "Tracbel",
        period: "9 months",
        role: "Product Designer (sole designer)",
      },
      body: [
        "## Context",
        "Tracbel wanted to use fleet telemetry to automate the identification and notification of maintenance. Uptime Center handles predictive monitoring, remote diagnostics and service planning for multi-brand equipment (Volvo, Tigercat and others), serving very different profiles at once: technical specialist, coordinator, manager and field technician.",
        "I joined as the only designer in a squad with a PM, 3 devs and Tracbel stakeholders. Launched at Agrishow 2023.",
        "[[img:/case-studies/uptime-login.png|Uptime Center login screen]]",
        "## Actions",
        "I ran discovery with consultants, managers, technicians and mechanics to understand how the team prioritized alerts in practice — the real flow, the exceptions and where the system could help.",
        "I built the Design System alongside the product: components that work across multiple brands and screen sizes, from the office desktop to the field tablet. I worked next to the devs on handoff, aligning each component's behavior in real time.",
        "[[img:/case-studies/uptime-control-room.png|Tracbel operations room]]",
        "## Results and takeaways",
        "Uptime Center became part of Tracbel's after-sales operation: severity-based alerts, remote diagnostics, service planning and a multi-brand fleet view in one coherent interface.",
        "Being the only designer in the squad forced me to be the connection point between product, business and engineering — deciding faster, communicating better and holding fidelity between prototype and final product.",
        "[[img:/case-studies/uptime-signage.png|Uptime Center signage above the team monitors]]",
      ],
    },
  },

  L3: {
    pt: {
      title: "Solv",
      role: "Neo Ventures — SaaS B2B de inovação",
      header: {
        company: "Neo Ventures",
        period: "36 meses",
        role: "Product Designer & Product Manager",
      },
      body: [
        "## Contexto",
        "O Solv começou como software de inovação aberta (formulários, triagem de startups, white label) e virou uma plataforma que cobre inovação interna, portfólio de projetos, melhoria contínua e um copiloto de IA. O produto cresceu, mas a experiência não acompanhou: funcionava para quem já conhecia os caminhos, e travava para quem chegava novo ou para o cliente que queria enxergar valor estratégico.",
        "## Ações",
        "Conduzi o redesign de ponta a ponta e gerenciei o produto em paralelo: escrevi histórias de usuário, critérios de aceite e regras de negócio, aliei roadmap com a liderança e toquei o relacionamento direto com clientes nas validações. O desafio era fazer inúmeras features, tipos de cliente e cenários andarem em harmonia para usuários muito diferentes.",
        "Ao longo da Neo Ventures: +150 protótipos funcionais, +80 features e +60 épicos em +80 sprints. Construí do zero o Design System (+30 componentes, tokens e guidelines) e conduzi +10 processos de discovery com usuários e 5 design sprints.",
        "## Resultados e conclusões",
        "O Solv é hoje referência em gestão da inovação, usado por clientes como Samarco, Nexa, Andrade Gutierrez, Vale e CCEE. O Design System acelerou o ciclo de entrega de novas features e eliminou a inconsistência visual acumulada ao longo dos anos.",
      ],
    },
    en: {
      title: "Solv",
      role: "Neo Ventures — B2B innovation SaaS",
      header: {
        company: "Neo Ventures",
        period: "36 months",
        role: "Product Designer & Product Manager",
      },
      body: [
        "## Context",
        "Solv started as open-innovation software (forms, startup screening, white label) and became a platform covering internal innovation, project portfolios, continuous improvement and an AI copilot. The product grew but the experience didn't keep up: it worked for people who knew its paths and stalled for newcomers or for the client trying to see strategic value.",
        "## Actions",
        "I led the end-to-end redesign and managed the product in parallel: I wrote user stories, acceptance criteria and business rules, aligned the roadmap with leadership and ran direct client relationships during validations. The challenge was making countless features, client types and scenarios move in harmony for very different users.",
        "Across Neo Ventures: 150+ functional prototypes, 80+ features and 60+ epics in 80+ sprints. I built the Design System from scratch (30+ components, tokens and guidelines) and ran 10+ discovery processes with users plus 5 design sprints.",
        "## Results and takeaways",
        "Solv is now a reference in innovation management, used by clients such as Samarco, Nexa, Andrade Gutierrez, Vale and CCEE. The Design System accelerated the delivery cycle of new features and eliminated the visual inconsistency that had piled up over the years.",
      ],
    },
  },

  L4: {
    pt: {
      title: "Terapio",
      role: "Healthtech — TIM AWC",
      header: {
        company: "Terapio · aceleração TIM AWC",
        period: "7 meses",
        role: "Product Designer",
      },
      body: [
        "## Contexto",
        "Em 2021 entrei no programa de aceleração TIM AWC com o Terapio, uma healthtech de fisioterapia. A proposta era conectar pacientes e fisioterapeutas por telemedicina e ajudar quem precisava continuar o tratamento em casa, fora do consultório. Fui responsável pelo design do produto do começo ao fim.",
        "## Ações",
        "Conduzi +15 entrevistas com pacientes e fisioterapeutas. Do lado do paciente, a maioria não fazia os exercícios em casa (esquecimento, rotina, insegurança de se machucar sozinho); do lado do terapeuta, ajustar um plano no meio da semana era lento. Nos testes, vídeos davam confiança, mas era difícil segurar o celular e se exercitar ao mesmo tempo.",
        "A partir disso: projetei um sistema de lembretes encaixado na rotina de cada paciente; redesenhei o player de vídeo para alternar entre assistir e executar sem segurar o celular (controles acessíveis, progresso visível em tela pequena); e simplifiquei o painel do fisioterapeuta, transformando vários passos numa edição direta. Ao todo, +25 interfaces em +28 sprints.",
        "## Resultados e conclusões",
        "Saímos com identidade visual própria, fluxos validados com usuários e protótipo em alta fidelidade dentro do prazo da aceleração — e o projeto foi selecionado pela Unimed. Aprendi que, quando o usuário tem dor, mobilidade limitada ou baixa energia, a interface precisa trabalhar por ele: muitos só usavam o celular com uma mão, ou sem lugar pra apoiar enquanto se exercitavam.",
      ],
      links: [
        {
          label: "Ver projeto no Behance",
          url: "https://www.behance.net/gallery/146176583/Terapio-App-de-Fisioterapia",
        },
        {
          label: "Seleção Unimed (Liga contra o Câncer)",
          url: "https://ligacontraocancer.com.br/?p=37056",
        },
        {
          label: "TCC (Repositório UFC)",
          url: "https://repositorio.ufc.br/bitstream/riufc/68205/1/2022_tcc_nfdefigueiredo%20%281%29.pdf",
        },
      ],
    },
    en: {
      title: "Terapio",
      role: "Healthtech — TIM AWC",
      header: {
        company: "Terapio · TIM AWC accelerator",
        period: "7 months",
        role: "Product Designer",
      },
      body: [
        "## Context",
        "In 2021 I joined the TIM AWC acceleration program with Terapio, a physiotherapy healthtech. The idea was to connect patients and physiotherapists via telemedicine and help those who needed to keep treatment going at home, away from the clinic. I owned product design from start to finish.",
        "## Actions",
        "I ran 15+ interviews with patients and physiotherapists. On the patient side, most didn't exercise at home (forgetting, routine, fear of getting hurt alone); on the therapist side, adjusting a plan mid-week was slow. In testing, videos built confidence, but holding the phone while exercising was hard.",
        "From that: I designed a reminder system that fits each patient's routine; redesigned the video player to switch between watching and doing without holding the phone (accessible controls, progress visible on small screens); and simplified the physiotherapist panel, turning many steps into direct editing. In total, 25+ interfaces across 28+ sprints.",
        "## Results and takeaways",
        "We left with our own visual identity, user-validated flows and a high-fidelity prototype within the accelerator deadline — and the project was selected by Unimed. I learned that when a user is in pain, has limited mobility or low energy, the interface has to work for them: many could only use the phone with one hand, or had nowhere to prop it while exercising.",
      ],
      links: [
        {
          label: "View project on Behance",
          url: "https://www.behance.net/gallery/146176583/Terapio-App-de-Fisioterapia",
        },
        {
          label: "Unimed selection (Liga contra o Câncer)",
          url: "https://ligacontraocancer.com.br/?p=37056",
        },
        {
          label: "Thesis (UFC repository)",
          url: "https://repositorio.ufc.br/bitstream/riufc/68205/1/2022_tcc_nfdefigueiredo%20%281%29.pdf",
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

  L7: {
    pt: {
      title: "Créditos",
      role: "Colofão e bastidores",
      body: [
        "ao meu amigo pedro, por me apresentar o apple sharp!",
        "Ao apple-sharp, pois foi o mecanismo utilizado para gerar os modelos 3D dos metrôs.",
        "Ao incrível livro One Metro World e ao trabalho do Jug Cerovic, que documentou, organizou e criou um sistema de design para mapas de metrô incrível.",
        "ao claudinho e o codex!",
        "## Recomendações",
        "E já que você chegou até aqui: umas musiquinhas, filmes e livros que eu acho que todo mundo deveria conhecer! :o",
      ],
      links: [
        {
          label: "One Metro World",
          url: "https://www.inat.fr/files/One_Metro_World_Jug_Cerovic.pdf",
        },
      ],
      media: recommendationMedia.pt,
    },
    en: {
      title: "Credits",
      role: "Colophon & behind the scenes",
      body: [
        "to my friend pedro, for introducing me to apple sharp!",
        "to apple-sharp, the engine used to generate the 3d models of the metros.",
        "to the incredible book one metro world and jug cerovic's work, which documented, organized and created a design system for building metro map systems — incredible.",
        "to little claude and codex!",
        "## Recommendations",
        "And since you made it this far: some songs, films and books I think everyone should know! :o",
      ],
      links: [
        {
          label: "One Metro World",
          url: "https://www.inat.fr/files/One_Metro_World_Jug_Cerovic.pdf",
        },
      ],
      media: recommendationMedia.en,
    },
  },

  L9: {
    pt: {
      title: "Tour House",
      role: "SaaS B2B de viagens corporativas — OBT",
      header: {
        company: "Tour House",
        period: "7 meses",
        role: "Product Designer · UX/UI Designer",
      },
      body: [
        "## Contexto",
        "A Tour House é uma agência de viagens corporativas, e o OBT é a plataforma onde as empresas clientes reservam e gerenciam suas viagens. Reserva corporativa é um domínio cheio de regras (políticas de viagem, aprovações, orçamento, integrações), e o desafio é fazer tudo isso caber numa interface que o usuário final use sem manual.",
        "## Ações",
        "Conduzo o design de ponta a ponta, do discovery à entrega: pesquisa, fluxos, protótipos em alta fidelidade (pixel perfect no Figma) e handoff para Engenharia. Trabalho lado a lado com o PM e os stakeholders na priorização de demandas e na tradução de requisitos em soluções de design.",
        "## Resultados e conclusões",
        "Do discovery à entrega em +15 sprints, entreguei +25 features ao longo de 12 épicos, com um handoff que mantém a fidelidade visual e funcional entre o protótipo e o que chega no ar — sem deixar a Engenharia adivinhando.",
      ],
    },
    en: {
      title: "Tour House",
      role: "B2B corporate travel SaaS — OBT",
      header: {
        company: "Tour House",
        period: "7 months",
        role: "Product Designer · UX/UI Designer",
      },
      body: [
        "## Context",
        "Tour House is a corporate travel agency, and the OBT is the platform where client companies book and manage their trips. Corporate travel booking is a domain full of rules (travel policies, approvals, budgets, integrations), and the challenge is fitting all of it into an interface the end user can operate without a manual.",
        "## Actions",
        "I run design end to end, from discovery to delivery: research, flows, high-fidelity prototypes (pixel perfect in Figma) and handoff to Engineering. I work side by side with the PM and stakeholders on prioritizing demands and translating requirements into design solutions.",
        "## Results and takeaways",
        "From discovery to delivery in 15+ sprints, I shipped 25+ features across 12 epics, with a handoff that keeps visual and functional fidelity between the prototype and what ships — never leaving Engineering guessing.",
      ],
    },
  },

  L8: {
    pt: {
      title: "Contato",
      role: "Contato",
      body: [
        "Quer conversar sobre produto, música, pesquisa, design system ou uma ideia meio torta que ainda precisa ganhar trilho? Me chama.",
      ],
      links: [{ label: "Abrir formulário de contato", url: "/?contact=1" }],
    },
    en: {
      title: "Contact",
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

export const CONTENT_LINE_ORDER = ["L1", "L2", "L9", "L3", "L4", "L5", "L7", "L8"] as const;

export function getStationContent(lineId: string, lang: ContentLang): StationContent | undefined {
  return portfolioContent[lineId]?.[lang];
}

export function lineTitle(lineId: string, lang: ContentLang): string | undefined {
  return portfolioContent[lineId]?.[lang]?.title;
}
