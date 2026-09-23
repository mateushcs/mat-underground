import { uptimeCase } from "./uptimeCase";
import { solvCase } from "./solvCase";
import { terapioCase } from "./terapioCase";
import { tourHouseCase } from "./tourHouseCase";

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
  /** e.g. "Out 2022 – jun 2023 · 9 meses" */
  period: string;
  /** Mateus's role on the project */
  role: string;
  /** who Mateus collaborated with (e.g. "PM, 3 devs, CTO") */
  team?: string;
}

export interface StationContent {
  title: string;
  role: string;
  /** Project pages carry a small header block (client, company, duration, role). */
  header?: StationHeader;
  body: string[];
  links?: StationLink[];
  media?: StationMedia[];
  /**
   * "case" opts a station into the long-form case-study layout (hero, metadata
   * grid, sticky section nav, two-column sections). Omitted = the default panel.
   */
  layout?: "case";
  /** discipline chips shown above the title in the case layout. */
  tags?: string[];
  /** one- or two-line summary shown in the case hero (Overview). */
  summary?: string;
  /** full-bleed editorial cover for the case layout (falls back to the poster). */
  cover?: { src: string; alt: string };
  /** Liner-notes credits (Créditos & Recs page). */
  credits?: StationCredit[];
}

export interface StationCredit {
  role: string;
  name: string;
  note: string;
  url?: string;
  urlLabel?: string;
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
      layout: "case",
      tags: ["Product Design", "Product Management", "Pesquisa", "Música"],
      summary:
        "Product designer e manager em Fortaleza. Do discovery ao handoff, equilibrando estratégia, negócio e quem usa.",
      body: [
        "Oiê! Hi! 你好！Eu sou o Mateus, mas pode me chamar de Mat. Eu trabalho com design e gestão de produto aqui de Fortalcity, e do resto do mundo também quando dá pra ser remoto. Já passei por projetos em áreas como SaaS B2B, agritech, healthtech e inovação aberta, e cada área me ensinou uma coisa diferente. Ah, e quando sobra um tempo, eu também produzo música.",
        "Já faz mais de cinco anos que eu venho desenhando produto digital de ponta a ponta, do discovery ao handoff pros devs. O que eu mais gosto é de pegar os dados, os desejos e os destinos das pessoas e transformar tudo isso em produto, equilibrando a estratégia, o negócio e o lado de quem vai usar. E faço isso de bom humor, sempre.",
        "Nesse tempo, construí um design system do zero, com foco em tokenização e em diretrizes de uso e aplicação, e conduzi pesquisas em iniciativas complexas, tanto com foco em estratégia quanto em usabilidade e melhoria de produtos SaaS B2B.",
        "Também já atuei como product manager, tomando decisões estratégicas, conduzindo o time, acompanhando métricas e construindo o roadmap junto com a liderança e o marketing.",
      ],
    },
    en: {
      title: "About me",
      role: "Product designer & manager · Fortaleza",
      layout: "case",
      tags: ["Product Design", "Product Management", "Research", "Music"],
      summary:
        "Product designer and manager in Fortaleza. From discovery to handoff, balancing strategy, business and the people who use it.",
      body: [
        "Oiê! Hi! 你好! I'm Mateus, but you can call me Mat. I work in product design and management from Fortaleza, and anywhere else when remote work makes it possible. I've worked on projects in areas such as B2B SaaS, agritech, healthtech and open innovation, and each taught me something different. Oh, and when I have some spare time, I also make music.",
        "I've been designing digital products end to end for more than five years now, from discovery all the way to the handoff to the devs. What i enjoy the most is taking people's data, desires and destinations and turning all of that into a product, balancing the strategy, the business and the side of whoever is going to use it. And i do it in a good mood, always.",
        "Along the way, i built a design system from scratch, focused on tokenization and on usage and application guidelines, and i led research on complex initiatives, both focused on strategy and on usability and improvement of B2B SaaS products.",
        "I've also worked as a product manager, making strategic decisions, leading the team, following the metrics and building the roadmap together with leadership and marketing.",
      ],
    },
  },

  L2: {
    pt: {
      title: "Uptime Center",
      role: "Tracbel · monitoramento preditivo",
      layout: "case",
      tags: ["UX/UI Design", "Design System", "Monitoramento preditivo", "Pesquisa"],
      summary:
        "Da conferência manual à manutenção preventiva: como desenhei uma experiência integrada para os consultores de pós-venda da Tracbel.",
      header: {
        company: "Neo Ventures",
        client: "Tracbel",
        period: "9 meses",
        role: "Product Designer (designer único)",
        team: "PM, 3 devs, stakeholders da Tracbel",
      },
      cover: { src: "/case-studies/uptime-cover.webp", alt: "Equipe da Tracbel na central de operação do Uptime Center" },
      body: uptimeCase.pt,
    },
    en: {
      title: "Uptime Center",
      role: "Tracbel · predictive monitoring",
      layout: "case",
      tags: ["UX/UI Design", "Design System", "Predictive monitoring", "Research"],
      summary:
        "From manual checks to preventive maintenance: designing an integrated experience for Tracbel’s after-sales consultants.",
      header: {
        company: "Neo Ventures",
        client: "Tracbel",
        period: "9 months",
        role: "Product Designer (sole designer)",
        team: "PM, 3 devs, Tracbel stakeholders",
      },
      cover: { src: "/case-studies/uptime-cover.webp", alt: "Tracbel team in the Uptime Center operations room" },
      body: uptimeCase.en,
    },
  },

  L3: {
    pt: {
      title: "Solv",
      role: "Neo Ventures · SaaS B2B de inovação",
      layout: "case",
      tags: ["UX/UI Design", "Design System", "Product Management", "Pesquisa"],
      summary:
        "Do software de inovação aberta à plataforma completa: como redesenhei o Solv, destravei a participação e construí o sistema que deu consistência ao produto.",
      header: {
        company: "Neo Ventures",
        period: "36 meses",
        role: "Product Designer & Product Manager",
        team: "2 designers, 1 tech lead, 5 devs",
      },
      cover: { src: "/case-studies/solv/solv-home.webp", alt: "Home do gestor de inovação no Solv" },
      body: solvCase.pt,
    },
    en: {
      title: "Solv",
      role: "Neo Ventures · B2B innovation SaaS",
      layout: "case",
      tags: ["UX/UI Design", "Design System", "Product Management", "Research"],
      summary:
        "From open-innovation software to a full platform: how I redesigned Solv, unblocked participation and built the system that gave the product consistency.",
      header: {
        company: "Neo Ventures",
        period: "36 months",
        role: "Product Designer & Product Manager",
        team: "2 designers, 1 tech lead, 5 devs",
      },
      cover: { src: "/case-studies/solv/solv-home.webp", alt: "The innovation manager's home in Solv" },
      body: solvCase.en,
    },
  },

  L4: {
    pt: {
      title: "Terapio",
      role: "Healthtech · TIM AWC",
      layout: "case",
      tags: ["UX/UI Design", "Branding", "Healthtech", "Pesquisa"],
      summary:
        "Do TCC à aceleração da TIM: como desenhei um sistema de fisioterapia à distância para pacientes e fisioterapeutas, da pesquisa à identidade visual.",
      header: {
        company: "Terapio · aceleração TIM AWC",
        period: "7 meses",
        role: "Product Designer",
        team: "Equipe de 3 pessoas",
      },
      cover: { src: "/case-studies/terapio/terapio-capa.webp", alt: "Capa da identidade visual do Terapio" },
      body: terapioCase.pt,
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
      layout: "case",
      tags: ["UX/UI Design", "Branding", "Healthtech", "Research"],
      summary:
        "From thesis to TIM's accelerator: how I designed a remote physiotherapy system for patients and physiotherapists, from research to visual identity.",
      header: {
        company: "Terapio · TIM AWC accelerator",
        period: "7 months",
        role: "Product Designer",
        team: "Team of 3 people",
      },
      cover: { src: "/case-studies/terapio/terapio-capa.webp", alt: "Terapio visual identity cover" },
      body: terapioCase.en,
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
      layout: "case",
      tags: ["Produção musical", "FL Studio", "Composição"],
      summary: "Produzo música nas horas vagas e adoro fazer um som com quem canta ou compõe.",
      body: [
        "Gosto de produzir músicas por aí, e se você é cantor/compositor, tô sempre disponível pra fazer um som!",
        "Se quiser dar uma ouvidinha:",
      ],
      media: musicEmbeds.pt,
    },
    en: {
      title: "Music",
      role: "Music production · FL Studio",
      layout: "case",
      tags: ["Music production", "FL Studio", "Songwriting"],
      summary: "I make music in my spare time and I'm always up for a track with a singer or songwriter.",
      body: [
        "I like making music here and there, and if you're a singer/songwriter, I'm always up for making a track!",
        "If you want a little listen:",
      ],
      media: musicEmbeds.en,
    },
  },

  L7: {
    pt: {
      title: "Créditos & Recs",
      role: "Colofão, bastidores e recomendações",
      layout: "case",
      tags: ["Colofão", "Referências", "Recomendações"],
      summary: "Quem ajudou este metrô a sair do papel, e umas coisas que eu acho que todo mundo deveria conhecer.",
      credits: [
        { role: "A dica", name: "Pedro", note: "Meu amigo, por me apresentar o Apple Sharp!" },
        { role: "Motor 3D", name: "Apple Sharp", note: "O mecanismo usado para gerar os modelos 3D dos metrôs." },
        {
          role: "Referência",
          name: "One Metro World",
          note: "O livro incrível do Jug Cerovic, que documentou, organizou e criou um sistema de design para mapas de metrô.",
          url: "https://www.inat.fr/files/One_Metro_World_Jug_Cerovic.pdf",
          urlLabel: "Ler One Metro World",
        },
        { role: "Copilotos", name: "Claudinho e Codex", note: "Parceiros de código nessa construção!" },
      ],
      body: [
        "Ao meu amigo Pedro, por me apresentar o Apple Sharp!",
        "Ao Apple Sharp, pois foi o mecanismo utilizado para gerar os modelos 3D dos metrôs.",
        "Ao incrível livro One Metro World e ao trabalho do Jug Cerovic, que documentou, organizou e criou um sistema de design para mapas de metrô incrível.",
        "Ao Claudinho e ao Codex!",
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
      title: "Credits & Recs",
      role: "Colophon, behind the scenes & recommendations",
      layout: "case",
      tags: ["Colophon", "References", "Recommendations"],
      summary: "Who helped this metro leave the drawing board, and a few things I think everyone should know.",
      credits: [
        { role: "The tip", name: "Pedro", note: "My friend, for introducing me to Apple Sharp!" },
        { role: "3D engine", name: "Apple Sharp", note: "The engine used to generate the 3D models of the metros." },
        {
          role: "Reference",
          name: "One Metro World",
          note: "Jug Cerovic's incredible book, which documented, organized and created a design system for metro maps.",
          url: "https://www.inat.fr/files/One_Metro_World_Jug_Cerovic.pdf",
          urlLabel: "Read One Metro World",
        },
        { role: "Copilots", name: "Little Claude & Codex", note: "Code partners on this build!" },
      ],
      body: [
        "To my friend Pedro, for introducing me to Apple Sharp!",
        "To Apple Sharp, the engine used to generate the 3D models of the metros.",
        "To the incredible book One Metro World and Jug Cerovic's work, which documented, organized and created an amazing design system for building metro map systems.",
        "To little Claude and Codex!",
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
      layout: "case",
      tags: ["UX/UI Design", "SaaS B2B", "Discovery", "Prototipagem"],
      summary:
        "Como desenhei um OBT que caiba numa interface simples: três públicos, as regras de cada cliente e um fluxo de reserva feito para ninguém precisar de treinamento.",
      header: {
        company: "Tour House",
        period: "7 meses",
        role: "Product Designer · UX/UI Designer",
        team: "PM e stakeholders",
      },
      cover: { src: "/case-studies/tour-house-busca.webp", alt: "Busca do OBT com assistente de IA" },
      body: tourHouseCase.pt,
    },
    en: {
      title: "Tour House",
      role: "B2B corporate travel SaaS · OBT",
      layout: "case",
      tags: ["UX/UI Design", "B2B SaaS", "Discovery", "Prototyping"],
      summary:
        "How I designed an OBT that fits into a simple interface: three audiences, every client's rules and a booking flow built so no one needs training.",
      header: {
        company: "Tour House",
        period: "7 months",
        role: "Product Designer · UX/UI Designer",
        team: "PM and stakeholders",
      },
      cover: { src: "/case-studies/tour-house-busca.webp", alt: "OBT search with an AI assistant" },
      body: tourHouseCase.en,
    },
  },

  L8: {
    pt: {
      title: "Contato",
      role: "Contato",
      layout: "case",
      tags: ["Contato"],
      body: [
        "Quer conversar sobre produto, música, pesquisa, design system ou uma ideia meio torta que ainda precisa ganhar trilho? Me chama.",
      ],
      links: [{ label: "Abrir formulário de contato", url: "/?contact=1" }],
    },
    en: {
      title: "Contact",
      role: "Contact",
      layout: "case",
      tags: ["Contact"],
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
