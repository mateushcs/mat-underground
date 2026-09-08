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
      role: "Product designer & manager · Fortaleza",
      body: [
        "oiê! hi! 你好！eu sou o mateus, mas pode me chamar de mat. eu trabalho com design e gestão de produto aqui de fortalcity, e do resto do mundo também quando dá pra ser remoto.",
        "já faz mais de cinco anos que eu venho desenhando produto digital de ponta a ponta, desde o discovery até o handoff pros devs. o que eu mais gosto é de pegar os dados, os desejos e os destinos das pessoas e transformar tudo isso em produto, tentando sempre equilibrar a estratégia, o negócio e o lado de quem vai usar. e faço isso de bom humor, sempre.",
        "na neo ventures, por exemplo, eu redesenhei um design system do zero, com mais de 30 componentes, e ao longo desses anos entreguei mais de 80 features em mais de 80 sprints, sempre partindo de conversas de discovery com usuário. era tudo SaaS B2B bem complexo, e eu tocava o processo inteiro, da pesquisa até o handoff.",
        "também já trabalhei como product manager, escrevendo as histórias de usuário, priorizando o roadmap, olhando os dados e cuidando do relacionamento direto com o cliente.",
        "nesses anos eu passei por SaaS B2B, agritech, healthtech e inovação aberta, e cada área me ensinou uma coisa diferente. ah, e quando sobra um tempo, eu também produzo música.",
      ],
    },
    en: {
      title: "About me",
      role: "Product designer & manager · Fortaleza",
      body: [
        "oiê! hi! 你好! i'm mateus, but you can call me mat. i work with product design and product management here in fortalcity, and anywhere else too when it can be remote.",
        "i've been designing digital products end to end for more than five years now, from discovery all the way to the handoff to the devs. what i enjoy the most is taking people's data, desires and destinations and turning all of that into a product, always trying to balance the strategy, the business and the side of whoever is going to use it. and i do it in a good mood, always.",
        "at neo ventures, for example, i redesigned a design system from scratch, with more than 30 components, and over those years i shipped more than 80 features across more than 80 sprints, always starting from discovery conversations with users. it was all fairly complex B2B SaaS, and i ran the whole process, from research to handoff.",
        "i've also worked as a product manager, writing the user stories, prioritizing the roadmap, looking at the data and taking care of the direct relationship with the client.",
        "over these years i've been through B2B SaaS, agritech, healthtech and open innovation, and each area taught me something different. oh, and when i have some spare time, i also make music.",
      ],
    },
  },

  L2: {
    pt: {
      title: "Uptime Center",
      role: "Tracbel · monitoramento preditivo",
      header: {
        company: "Neo Ventures",
        client: "Tracbel",
        period: "9 meses",
        role: "Product Designer (designer único)",
      },
      body: [
        "## Contexto",
        "A Tracbel queria usar a telemetria das frotas pra automatizar a identificação e a notificação das manutenções. O Uptime Center faz monitoramento preditivo, diagnóstico remoto e planejamento de serviço pra equipamentos de várias marcas (Volvo, Tigercat e outras), e atende perfis bem diferentes ao mesmo tempo: o especialista técnico, o coordenador, o gestor e o técnico de campo.",
        "Entrei como único designer numa squad com PM, 3 devs e os stakeholders da Tracbel, e a gente lançou o produto na Agrishow de 2023.",
        "[[img:/case-studies/uptime-login.png|Tela de login do Uptime Center]]",
        "## Desafio",
        "A equipe de pós-venda monitorava frotas inteiras, de várias marcas, tudo na mão. O sistema precisava mostrar o que exige ação agora e o que pode esperar, de forma que perfis bem diferentes, do especialista técnico ao técnico de campo, conseguissem ler a mesma tela sem dificuldade. E era muita superfície pra um designer só dar conta: análise de óleo, monitoramento das máquinas, dashboards e integrações, tudo precisando de consistência.",
        "## Ações",
        "Toquei o discovery com consultores, gestores, técnicos e mecânicos pra entender como a equipe priorizava os alertas no dia a dia, quais eram as exceções e onde o sistema podia dar uma mão.",
        "A partir disso, montei um design system adaptado a partir de uma biblioteca que já existia e fui evoluindo ele junto com o produto ao longo de mais de 14 sprints. Desenhei bastante coisa: as regras pra análise de óleo, o monitoramento das máquinas num mapa ao vivo, os alertas por severidade, os dashboards, o planejamento de serviço e a integração com o SAP e outros sistemas, com componentes que funcionam pra várias marcas e em telas diferentes, do desktop do escritório até o tablet no campo. Trabalhei lado a lado com os devs no handoff, alinhando o comportamento de cada componente na hora.",
        "[[img:/case-studies/uptime-control-room.png|Central de operação da Tracbel]]",
        "## Resultados e conclusões",
        "O Uptime Center entrou na operação de pós-venda da Tracbel, com alertas por severidade, diagnóstico remoto, monitoramento das máquinas no mapa, dashboards e planejamento de serviço numa interface só.",
        "Ser o único designer da squad me obrigou a ser o ponto de conexão entre produto, negócio e os devs, a decidir rápido, comunicar melhor e segurar a fidelidade entre o protótipo e o produto final.",
        "[[img:/case-studies/uptime-signage.png|Placa Uptime Center sobre os monitores]]",
      ],
    },
    en: {
      title: "Uptime Center",
      role: "Tracbel · predictive monitoring",
      header: {
        company: "Neo Ventures",
        client: "Tracbel",
        period: "9 months",
        role: "Product Designer (sole designer)",
      },
      body: [
        "## Context",
        "Tracbel wanted to use fleet telemetry to automate spotting and flagging maintenance. Uptime Center does predictive monitoring, remote diagnostics and service planning for multi-brand equipment (Volvo, Tigercat and others), and it serves very different profiles at the same time: the technical specialist, the coordinator, the manager and the field technician.",
        "I came in as the only designer in a squad with a PM, 3 devs and the Tracbel stakeholders, and we launched the product at Agrishow 2023.",
        "[[img:/case-studies/uptime-login.png|Uptime Center login screen]]",
        "## Challenge",
        "The after-sales team monitored whole fleets, across many brands, all by hand. The system had to show what needs action now and what can wait, so that very different profiles, from the technical specialist to the field technician, could read the same screen without trouble. And it was a lot of surface for a single designer to cover: oil analysis, machine monitoring, dashboards and integrations, all needing to stay consistent.",
        "## Actions",
        "I ran discovery with consultants, managers, technicians and mechanics to understand how the team prioritized alerts day to day, what the exceptions were, and where the system could help.",
        "From there, I put together a design system adapted from an existing library and grew it alongside the product across 14+ sprints. I designed a lot of it: the rules for oil analysis, live machine monitoring on a map, severity-based alerts, dashboards, service planning and the integration with SAP and other systems, with components that work across brands and screen sizes, from the office desktop to the field tablet. I worked side by side with the devs on the handoff, aligning each component's behaviour on the spot.",
        "[[img:/case-studies/uptime-control-room.png|Tracbel operations room]]",
        "## Results and takeaways",
        "Uptime Center became part of Tracbel's after-sales operation, with severity-based alerts, remote diagnostics, machine monitoring on the map, dashboards and service planning in a single interface.",
        "Being the only designer in the squad forced me to be the connection point between product, business and the devs, to decide faster, communicate better and hold the fidelity between prototype and final product.",
        "[[img:/case-studies/uptime-signage.png|Uptime Center signage above the team monitors]]",
      ],
    },
  },

  L3: {
    pt: {
      title: "Solv",
      role: "Neo Ventures · SaaS B2B de inovação",
      header: {
        company: "Neo Ventures",
        period: "36 meses",
        role: "Product Designer & Product Manager",
      },
      body: [
        "## Contexto",
        "O Solv começou como um software de inovação aberta (formulários, triagem de startups, white label) e foi virando uma plataforma que cobre inovação interna, portfólio de projetos, melhoria contínua e até um copiloto de IA. O produto cresceu bastante, mas a experiência não acompanhou: quem já conhecia os caminhos se virava, e quem chegava novo, ou o cliente que queria enxergar o valor estratégico, acabava se perdendo no meio do caminho.",
        "## Desafio",
        "Fazer um monte de feature, tipo de cliente e cenário andarem em harmonia pra usuários bem diferentes, preservando quem já dependia do produto no dia a dia. E eu acumulava dois papéis ao mesmo tempo: era o designer do redesign e o product manager que decidia o que entrava no roadmap.",
        "## Ações",
        "Conduzi o redesign de ponta a ponta e gerenciei o produto em paralelo. Escrevi as histórias de usuário, os critérios de aceite e as regras de negócio, alinhei o roadmap com a liderança e toquei o relacionamento direto com os clientes nas validações.",
        "Ao longo desses anos na Neo Ventures foram mais de 150 protótipos funcionais, mais de 80 features e mais de 60 épicos em mais de 80 sprints. Construí o design system do zero, com mais de 30 componentes, tokens e guidelines, e conduzi mais de 10 discoveries com usuários e 5 design sprints.",
        "## Resultados e conclusões",
        "Hoje o Solv é referência em gestão da inovação, usado por clientes como Samarco, Nexa, Andrade Gutierrez, Vale e CCEE. O design system acelerou muito o ciclo de entrega de novas features e resolveu a inconsistência visual que tinha se acumulado ao longo dos anos.",
      ],
    },
    en: {
      title: "Solv",
      role: "Neo Ventures · B2B innovation SaaS",
      header: {
        company: "Neo Ventures",
        period: "36 months",
        role: "Product Designer & Product Manager",
      },
      body: [
        "## Context",
        "Solv started as open-innovation software (forms, startup screening, white label) and grew into a platform that covers internal innovation, project portfolios, continuous improvement and even an AI copilot. The product grew a lot, but the experience didn't keep up: people who already knew the paths got by, while newcomers, or the client trying to see the strategic value, ended up getting lost along the way.",
        "## Challenge",
        "Getting a ton of features, client types and scenarios to move in harmony for very different users, while keeping the people who already depended on the product day to day. And I wore two hats at once: I was the designer of the redesign and the product manager deciding what made the roadmap.",
        "## Actions",
        "I led the redesign end to end and managed the product in parallel. I wrote the user stories, the acceptance criteria and the business rules, aligned the roadmap with leadership and ran the direct client relationships during validations.",
        "Over those years at Neo Ventures it was more than 150 functional prototypes, 80+ features and 60+ epics across 80+ sprints. I built the design system from scratch, with 30+ components, tokens and guidelines, and ran 10+ discoveries with users plus 5 design sprints.",
        "## Results and takeaways",
        "Today Solv is a reference in innovation management, used by clients like Samarco, Nexa, Andrade Gutierrez, Vale and CCEE. The design system sped up the delivery cycle for new features a lot and fixed the visual inconsistency that had piled up over the years.",
      ],
    },
  },

  L4: {
    pt: {
      title: "Terapio",
      role: "Healthtech · TIM AWC",
      header: {
        company: "Terapio · aceleração TIM AWC",
        period: "7 meses",
        role: "Product Designer",
      },
      body: [
        "## Contexto",
        "Em 2021 entrei no programa de aceleração da TIM AWC com o Terapio, uma healthtech de fisioterapia. A ideia era conectar pacientes e fisioterapeutas por telemedicina e ajudar quem precisava continuar o tratamento em casa, longe do consultório. Fui o responsável pelo design do produto do começo ao fim.",
        "## Ações",
        "Conduzi mais de 15 entrevistas com pacientes e fisioterapeutas. Do lado do paciente, a maioria não fazia os exercícios em casa, seja por esquecimento, pela correria da rotina ou pela insegurança de se machucar sozinho; do lado do terapeuta, ajustar um plano no meio da semana era lento demais. Nos testes, os vídeos davam confiança, mas segurar o celular e se exercitar ao mesmo tempo era complicado.",
        "A partir daí, projetei um sistema de lembretes que se encaixava na rotina de cada paciente, redesenhei o player de vídeo pra alternar entre assistir e executar sem precisar segurar o celular (com controles acessíveis e o progresso visível numa tela pequena) e simplifiquei o painel do fisioterapeuta, transformando vários passos numa edição direta. No total foram mais de 25 interfaces em mais de 28 sprints.",
        "## Resultados e conclusões",
        "Saímos da aceleração com identidade visual própria, fluxos validados com usuários e um protótipo em alta fidelidade dentro do prazo, e o projeto ainda foi selecionado pela Unimed. Aprendi que, quando o usuário tá com dor, mobilidade limitada ou pouca energia, a interface precisa trabalhar por ele: muita gente só conseguia usar o celular com uma mão, ou não tinha onde apoiar o aparelho enquanto se exercitava.",
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
      role: "Healthtech · TIM AWC",
      header: {
        company: "Terapio · TIM AWC accelerator",
        period: "7 months",
        role: "Product Designer",
      },
      body: [
        "## Context",
        "In 2021 I joined the TIM AWC acceleration program with Terapio, a physiotherapy healthtech. The idea was to connect patients and physiotherapists over telemedicine and help the people who needed to keep their treatment going at home, away from the clinic. I owned the product design from start to finish.",
        "## Actions",
        "I ran more than 15 interviews with patients and physiotherapists. On the patient side, most of them didn't do the exercises at home, whether it was forgetting, the rush of daily life or the fear of getting hurt on their own; on the therapist side, adjusting a plan mid-week was way too slow. In testing, the videos built confidence, but holding the phone and exercising at the same time was tricky.",
        "From there, I designed a reminder system that fit into each patient's routine, redesigned the video player so people could switch between watching and doing without holding the phone (with accessible controls and progress you can see on a small screen), and simplified the physiotherapist panel, turning a bunch of steps into direct editing. In all it was more than 25 interfaces across 28+ sprints.",
        "## Results and takeaways",
        "We came out of the accelerator with our own visual identity, flows validated with users and a high-fidelity prototype within the deadline, and the project was even selected by Unimed. I learned that when a user is in pain, has limited mobility or low energy, the interface has to work for them: a lot of people could only use the phone with one hand, or had nowhere to prop it while exercising.",
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
      role: "Produção musical · FL Studio",
      body: [
        "Gosto de produzir músicas por aí, e se você é cantor/compositor, tô sempre disponível pra fazer um som!",
        "Se quiser dar uma ouvidinha:",
      ],
      media: musicEmbeds.pt,
    },
    en: {
      title: "Music",
      role: "Music production · FL Studio",
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
        "to the incredible book one metro world and jug cerovic's work, which documented, organized and created an amazing design system for building metro map systems.",
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
      role: "SaaS B2B de viagens corporativas · OBT",
      header: {
        company: "Tour House",
        period: "7 meses",
        role: "Product Designer · UX/UI Designer",
      },
      body: [
        "## Contexto",
        "A Tour House é uma agência de viagens corporativas, e o OBT (Online Booking Tool) é a plataforma onde as empresas clientes buscam, reservam e governam as viagens do time (aéreo, hospedagem, veículos e rodoviário), com política de viagem, aprovações e controle de custo embutidos.",
        "[[img:/case-studies/tour-house-busca.png|Busca do OBT: aéreo, hospedagem, veículos e rodoviário, com assistente de IA]]",
        "## Desafio",
        "Reserva corporativa é um domínio cheio de regra: cada empresa tem a sua política, os seus centros de custo, aprovadores e orçamento. O produto precisa servir três públicos ao mesmo tempo: o viajante que quer resolver rápido, o aprovador que precisa decidir com contexto, e o gestor que quer visibilidade de gasto e compliance. O trabalho é fazer tudo isso caber numa interface simples o bastante pra ninguém precisar de treinamento.",
        "## Ações",
        "Conduzo o design de ponta a ponta, do discovery à entrega, ao longo de mais de 17 sprints, em parceria direta com o PM e os stakeholders, traduzindo os requisitos e a política de viagem em fluxos. Atuei em quatro frentes do produto.",
        "Na busca e reserva, montei um fluxo único que cobre aéreo, hospedagem, veículos e rodoviário, com busca avançada, últimas buscas e um assistente de IA (ainda em beta), pensado pra o comprador resolver a viagem em poucos cliques.",
        "Na governança, desenhei as solicitações e aprovações, transformando a política de cada cliente em decisões que o aprovador entende na hora.",
        "Nos bilhetes não voados, cuidei da gestão dos créditos de passagens que não foram usadas, com filtros, status e exportação de relatório, que no fim é dinheiro que a empresa consegue recuperar.",
        "[[img:/case-studies/tour-house-bilhetes.png|Gestão de bilhetes não voados: recuperação de créditos]]",
        "E nos indicadores de gestão, montei os dashboards de volume, viagens, passageiros e ticket médio, com recortes operacional, financeiro, de performance e de compliance, pra o gestor enxergar o gasto e a aderência à política.",
        "[[img:/case-studies/tour-house-dashboard.png|Indicadores de gestão: volume, viagens, passageiros e ticket médio]]",
        "Prototipei tudo em alta fidelidade, pixel perfect no Figma, e conduzi o handoff pros devs.",
        "## Resultados",
        "Do discovery à entrega, em mais de 17 sprints, entreguei mais de 25 features ao longo de 12 épicos, com um handoff que segura a fidelidade visual e funcional entre o protótipo e o que chega no ar. O aprendizado principal foi que, num produto B2B cheio de regra, o valor do design tá em reduzir a complexidade a decisões simples pra cada um dos três públicos, mantendo o controle que a empresa precisa ter.",
      ],
    },
    en: {
      title: "Tour House",
      role: "B2B corporate travel SaaS · OBT",
      header: {
        company: "Tour House",
        period: "7 months",
        role: "Product Designer · UX/UI Designer",
      },
      body: [
        "## Context",
        "Tour House is a corporate travel agency, and the OBT (Online Booking Tool) is the platform where client companies search, book and govern their team's travel (flights, hotels, cars and bus), with travel policy, approvals and cost control built in.",
        "[[img:/case-studies/tour-house-busca.png|OBT search: flights, hotels, cars and bus, with an AI assistant]]",
        "## Challenge",
        "Corporate booking is a domain full of rules: every company has its own policy, cost centres, approvers and budget. The product has to serve three audiences at once: the traveller who wants to be done fast, the approver who needs to decide with context, and the manager who wants spend visibility and compliance. The job is fitting all of that into an interface simple enough that no one needs training.",
        "## Actions",
        "I run the design end to end, from discovery to delivery, across more than 17 sprints, in close partnership with the PM and the stakeholders, translating the requirements and travel policy into flows. I worked on four fronts of the product.",
        "On search and booking, I put together a single flow that covers flights, hotels, cars and bus, with advanced search, recent searches and an AI assistant (still in beta), built for the buyer to sort out a trip in a few clicks.",
        "On governance, I designed the requests and approvals, turning each client's policy into decisions the approver understands right away.",
        "On unflown tickets, I handled the credits from tickets that went unused, with filters, status and report export, which in the end is money the company gets to recover.",
        "[[img:/case-studies/tour-house-bilhetes.png|Unflown-ticket management: recovering credits]]",
        "And on management analytics, I put together the dashboards for volume, trips, passengers and average ticket, with operational, financial, performance and compliance cuts, so the manager can see spend and policy adherence.",
        "[[img:/case-studies/tour-house-dashboard.png|Management analytics: volume, trips, passengers and average ticket]]",
        "I prototyped everything in high fidelity, pixel perfect in Figma, and ran the handoff to the devs.",
        "## Results",
        "From discovery to delivery, across more than 17 sprints, I shipped 25+ features over 12 epics, with a handoff that holds the visual and functional fidelity between the prototype and what goes live. The main takeaway was that, in a rule-heavy B2B product, the value of design is in reducing the complexity to simple decisions for each of the three audiences, while keeping the control the company needs to have.",
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
