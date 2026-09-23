import { createFileRoute, notFound } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, Moon, Sun } from "lucide-react";
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRouteTransition } from "@/components/RouteTransition";
import {
  portfolioStationBySlug,
  portfolioStations,
  type PortfolioStation,
} from "@/data/portfolioStations";
import {
  type StationContent,
  type StationCredit,
  type StationMedia,
} from "@/data/portfolioContent";
import { getStoredLanguage, setStoredLanguage, htmlLang, type ContentLang } from "@/lib/language";
import { getStoredTheme, setStoredTheme, withThemeFade, type MapTheme } from "@/lib/theme";
import { flushSync } from "react-dom";
import { CaseProcess } from "@/components/CaseProcess";
import { CaseWheelNav } from "@/components/CaseWheelNav";
import { PartyMode } from "@/components/PartyMode";
import { getStationContent, caseBriefs } from "@/data/caseEditorial";
import { CaseLightbox } from "@/components/CaseLightbox";
import { posterUrlFor } from "@/lib/posters";
import { lines as transitLines } from "@/data/transit";
import { groupMedia, mediaLabel, MEDIA_CATEGORY_LABELS } from "@/lib/mediaCategories";
import { CASE_EXTRAS } from "@/components/caseRegistry";
import { useCaseMotion } from "@/hooks/useCaseMotion";
import "@/case-study.css";
import "@/case-chrome.css";

const HEADER_LABELS: Record<
  ContentLang,
  { client: string; company: string; period: string; role: string }
> = {
  pt: { client: "Cliente", company: "Empresa", period: "Duração", role: "Função" },
  en: { client: "Client", company: "Company", period: "Duration", role: "Role" },
};

const CASE_LABELS: Record<
  ContentLang,
  { overview: string; team: string; back: string; jump: string }
> = {
  pt: { overview: "Visão geral", team: "Colaboração", back: "Mapa", jump: "Navegar" },
  en: { overview: "Overview", team: "Collaboration", back: "Map", jump: "On this page" },
};

export const Route = createFileRoute("/station/$stationId")({
  beforeLoad: ({ params }) => {
    if (!portfolioStationBySlug[params.stationId]) throw notFound();
  },
  head: ({ params }) => {
    const station = portfolioStationBySlug[params.stationId] ?? portfolioStations[0];
    const copy = getStationContent(station.lineId, "pt");
    const pageTitle = copy?.title ?? "Estação";
    return {
      meta: [
        { title: `${pageTitle} | mat underground club` },
        { name: "description", content: copy?.body[0] ?? "" },
      ],
    };
  },
  component: StationPage,
});

function StationPage() {
  const { stationId } = Route.useParams();
  const station = portfolioStationBySlug[stationId] ?? portfolioStations[0];

  return <StationDetail key={station.slug} station={station} />;
}

function StationDetail({ station }: { station: PortfolioStation }) {
  const [lang, setLang] = useState<ContentLang>("pt");
  const { go } = useRouteTransition();
  // Case-study stations render a solid editorial page instead of the glass
  // panel over the poster. Layout is language-agnostic, so read "pt".
  const isCase = getStationContent(station.lineId, "pt")?.layout === "case";

  useEffect(() => {
    const stored = getStoredLanguage();
    setLang(stored);
    document.documentElement.lang = htmlLang(stored);
  }, []);

  useEffect(() => {
    // Release the door transition once the poster is decoded (capped so a
    // missing poster never holds the doors).
    let done = false;
    let cap = 0;
    const announce = () => {
      if (done) return;
      done = true;
      window.clearTimeout(cap);
      window.dispatchEvent(new Event("mats:splat-ready"));
    };
    const img = new Image();
    img.src = posterUrlFor(station.slug);
    img.decode().then(announce, announce);
    cap = window.setTimeout(announce, 1500);
    return () => {
      done = true;
      window.clearTimeout(cap);
    };
  }, [station.slug]);

  const copy = getStationContent(station.lineId, lang) ?? getStationContent(station.lineId, "pt");
  const creditBookLink =
    station.lineId === "L7"
      ? copy?.links?.find((link) => link.label.toLowerCase().includes("one metro world"))
      : undefined;
  const stationLinks =
    copy?.links?.filter((link) => !(creditBookLink && link.url === creditBookLink.url)) ?? [];

  if (isCase && copy) {
    return <StationCaseStudy station={station} copy={copy} lang={lang} go={go} onLanguageChange={(next) => {
      setLang(next);
      setStoredLanguage(next);
      document.documentElement.lang = htmlLang(next);
      const url = new URL(window.location.href);
      if (url.searchParams.has("lang")) {
        url.searchParams.set("lang", next);
        window.history.replaceState(window.history.state, "", url);
      }
    }} />;
  }

  return (
    <main
      data-transition-surface="station"
      className="station-page relative min-h-screen overflow-x-hidden font-sans text-[#e5e1d6]"
      style={
        {
          "--station-accent": station.accent,
        } as CSSProperties
      }
    >
      <div
        className="station-poster"
        aria-hidden="true"
        style={{
          backgroundImage: `url(${posterUrlFor(station.slug)})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transition: "opacity 600ms ease",
        }}
      />
      <div className="station-veil" aria-hidden="true" />

      <button
        type="button"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          go({
            to: "/",
            dissolveFrom: {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              color: station.accent,
            },
          });
        }}
        className="station-back-link absolute left-5 top-5 z-20 inline-flex h-10 items-center gap-2 px-3 text-[12px] font-bold uppercase tracking-[0.12em] text-[#e5e1d6] transition sm:left-8 sm:top-8"
      >
        <ArrowLeft className="h-4 w-4" />
        {lang === "en" ? "Map" : "Mapa"}
      </button>

      <section className="station-shell">
        <article className="station-glass-panel">
          <h1 className="station-content-title">{copy?.title}</h1>
          {copy?.header && (
            <dl className="station-header">
              {copy.header.client && copy.header.client !== copy.header.company && (
                <div className="station-header-item">
                  <dt>{HEADER_LABELS[lang].client}</dt>
                  <dd>{copy.header.client}</dd>
                </div>
              )}
              <div className="station-header-item">
                <dt>{HEADER_LABELS[lang].company}</dt>
                <dd>{copy.header.company}</dd>
              </div>
              <div className="station-header-item">
                <dt>{HEADER_LABELS[lang].period}</dt>
                <dd>{copy.header.period}</dd>
              </div>
              <div className="station-header-item">
                <dt>{HEADER_LABELS[lang].role}</dt>
                <dd>{copy.header.role}</dd>
              </div>
            </dl>
          )}
          {copy?.body.map((paragraph, i) => {
            if (paragraph.startsWith("## ")) {
              return (
                <h2 key={i} className="station-section">
                  {paragraph.slice(3)}
                </h2>
              );
            }
            if (paragraph.startsWith("[[img:")) {
              const [src, alt] = paragraph.slice(6, -2).split("|");
              return (
                <figure key={i} className="station-photo">
                  <img
                    src={src}
                    alt={alt ?? ""}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      const fig = e.currentTarget.closest("figure");
                      if (fig) fig.style.display = "none";
                    }}
                  />
                </figure>
              );
            }
            const showCreditBookLink =
              !!creditBookLink && paragraph.toLowerCase().includes("one metro world");
            return (
              <Fragment key={i}>
                <p className={i === 0 ? "station-lead" : undefined}>{paragraph}</p>
                {showCreditBookLink && (
                  <a
                    href={creditBookLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="station-inline-link"
                  >
                    {lang === "en" ? "Read One Metro World" : "Ler One Metro World"}
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                )}
              </Fragment>
            );
          })}
          {copy?.media && copy.media.length > 0 && (
            <StationMediaGrid media={copy.media} lang={lang} />
          )}
          {stationLinks.length > 0 && (
            <div className="station-links">
              {stationLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target={link.url.startsWith("http") ? "_blank" : undefined}
                  rel={link.url.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="station-link"
                >
                  {link.label}
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}

function slugifyHeading(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type CaseSection = { id: string; label: string; items: string[] };

/** Split the body into an intro (pre-heading) and the `## `-delimited sections. */
function parseCaseSections(body: string[]): { intro: string[]; sections: CaseSection[] } {
  const intro: string[] = [];
  const sections: CaseSection[] = [];
  let current: CaseSection | null = null;
  for (const line of body) {
    if (line.startsWith("## ")) {
      const label = line.slice(3);
      current = { id: slugifyHeading(label) || `section-${sections.length + 1}`, label, items: [] };
      sections.push(current);
    } else if (current) {
      current.items.push(line);
    } else {
      intro.push(line);
    }
  }
  return { intro, sections };
}

function renderCaseItem(
  item: string,
  key: number,
  onImageClick?: (src: string, alt: string) => void,
  expandLabel = "Ampliar imagem",
) {
  if (item.startsWith("[[placeholder:")) {
    const [title, description] = item.slice(14, -2).split("|");
    return (
      <figure key={key} className="case-placeholder">
        <span className="case-placeholder-marker" aria-hidden="true">↳</span>
        <figcaption>
          <strong>{title}</strong>
          <span>{description}</span>
        </figcaption>
      </figure>
    );
  }
  // [[links:url|label;;url|label]] renders an inline row of contact links.
  if (item.startsWith("[[links:")) {
    const links = item.slice(8, -2).split(";;").map((entry) => entry.split("|"));
    return (
      <div key={key} className="case-links case-links--inline">
        {links.map(([url, label]) => (
          <a
            key={url}
            href={url}
            target={url.startsWith("http") ? "_blank" : undefined}
            rel={url.startsWith("http") ? "noopener noreferrer" : undefined}
            className="station-link"
          >
            {label}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ))}
      </div>
    );
  }
  if (item.startsWith("[[img:")) {
    const [src, alt] = item.slice(6, -2).split("|");
    return (
      <figure key={key} className={`case-figure${src.includes("/terapio/") && !src.includes("dashboard") ? " case-figure--phone" : ""}${src.includes("uptime-dashboard") ? " case-screen case-screen--dashboard" : src.includes("uptime-hours") ? " case-screen case-screen--hours" : ""}`}>
        <button
          type="button"
          className="case-image-window"
          onClick={() => onImageClick?.(src, alt ?? "")}
          aria-label={alt || expandLabel}
        >
          <img
            src={src}
            alt={alt ?? ""}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              const fig = e.currentTarget.closest("figure");
              if (fig) fig.style.display = "none";
            }}
          />
        </button>
        {alt && <figcaption>{alt}</figcaption>}
      </figure>
    );
  }
  return <p key={key}>{item}</p>;
}

function StationCaseStudy({
  station,
  copy,
  lang,
  go,
  onLanguageChange,
}: {
  station: PortfolioStation;
  copy: StationContent;
  lang: ContentLang;
  go: ReturnType<typeof useRouteTransition>["go"];
  onLanguageChange: (lang: ContentLang) => void;
}) {
  const labels = CASE_LABELS[lang];
  const pageRef = useRef<HTMLElement>(null);
  useCaseMotion(pageRef, `${station.slug}:${lang}`);
  const headerLabels = HEADER_LABELS[lang];
  const { intro, sections } = useMemo(() => parseCaseSections(copy.body), [copy.body]);
  const navItems = useMemo(
    () => [
      { id: "overview", label: labels.overview },
      ...sections.map((s) => ({ id: s.id, label: s.label })),
    ],
    [labels.overview, sections],
  );
  const [activeId, setActiveId] = useState("overview");
  const [theme, setTheme] = useState<MapTheme>("dark");
  useEffect(() => setTheme(getStoredTheme()), []);
  const projects = portfolioStations.filter(p => getStationContent(p.lineId, lang)?.header && p.active !== false);
  const projectIndex = projects.findIndex(p => p.slug === station.slug);
  const nextStation = projects[(projectIndex + 1) % projects.length];
  const prevStation = projects[(projectIndex - 1 + projects.length) % projects.length];
  const en = lang === "en";
  const extras = CASE_EXTRAS[station.lineId];
  const brief = caseBriefs[station.lineId]?.[lang];
  const caseImages = useMemo(
    () =>
      [...intro, ...sections.flatMap((s) => s.items)]
        .filter((item) => item.startsWith("[[img:"))
        .map((item) => {
          const [src, alt] = item.slice(6, -2).split("|");
          return { src, alt: alt ?? "" };
        }),
    [intro, sections],
  );
  const [lightbox, setLightbox] = useState<number | null>(null);
  const openImage = (src: string, alt: string) => {
    const index = caseImages.findIndex((img) => img.src === src && img.alt === alt);
    setLightbox(index === -1 ? null : index);
  };

  // Scrollspy: highlight the section nearest the middle of the viewport.
  useEffect(() => {
    const els = navItems
      .map((n) => document.getElementById(n.id))
      .filter((el): el is HTMLElement => !!el);
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [navItems]);

  const jumpTo = (id: string) => {
    setActiveId(id);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  };

  const header = copy.header;
  const meta: { label: string; value: string }[] = [];
  if (header) {
    if (header.client && header.client !== header.company)
      meta.push({ label: headerLabels.client, value: header.client });
    meta.push({ label: headerLabels.company, value: header.company });
    meta.push({ label: headerLabels.role, value: header.role });
    meta.push({ label: headerLabels.period, value: header.period });
    if (header.team) meta.push({ label: labels.team, value: header.team });
  }

  return (
    <main
      data-transition-surface="station"
      className="station-page station-case font-sans"
      ref={pageRef}
      data-case-theme={theme}
      style={{ "--station-accent": station.accent } as CSSProperties}
    >
      <PartyMode lang={lang} />
      {/* Holographic stroke for case icons (userSpaceOnUse so straight strokes still paint). */}
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="holo-stroke" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="24" y2="24">
            <stop offset="0" stopColor={theme === "light" ? "#4f63ff" : "#9fb8ff"} />
            <stop offset="0.3" stopColor={theme === "light" ? "#8e4ff0" : "#c2b1ff"} />
            <stop offset="0.55" stopColor={theme === "light" ? "#d9479b" : "#ffb3e4"} />
            <stop offset="0.8" stopColor={theme === "light" ? "#c98522" : "#ffe2ae"} />
            <stop offset="1" stopColor={theme === "light" ? "#1e9f8c" : "#b3fff0"} />
          </linearGradient>
        </defs>
      </svg>
      <button
        type="button"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          go({
            to: "/",
            dissolveFrom: {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              color: station.accent,
            },
          });
        }}
        className="station-back-link case-back"
      >
        <ArrowLeft className="h-4 w-4" />
        {labels.back}
      </button>

      <div className="case-cover">
        <img src={copy.cover?.src ?? posterUrlFor(station.slug)} alt={copy.cover?.alt ?? copy.title} fetchPriority="high" />
        <div className="case-cover-fade" />
      </div>
      <div className="case-controls">
        <div role="group" aria-label={en ? "Language" : "Idioma"}>
          {(["pt", "en"] as const).map(value => <button key={value} type="button" aria-pressed={lang === value} onClick={() => onLanguageChange(value)}>{value.toUpperCase()}</button>)}
        </div>
        <button type="button" aria-label={theme === "dark" ? (en ? "Switch to light theme" : "Mudar para tema claro") : (en ? "Switch to dark theme" : "Mudar para tema escuro")} onClick={() => {
          const next = theme === "dark" ? "light" : "dark";
          withThemeFade(() => flushSync(() => setTheme(next))); setStoredTheme(next);
        }}>{theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}</button>
      </div>
      <div className="case-wrap case-wrap--cover">
        <header id="overview" className="case-hero">
          {copy.tags && copy.tags.length > 0 && (
            <ul className="case-tags">
              {copy.tags.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
          <h1 className="case-title">{copy.title}</h1>
          {!brief && copy.summary && <p className="case-summary">{copy.summary}</p>}
          {brief && <section className="case-brief" aria-label="tldr">
            <div className="case-brief-heading"><span>tldr</span><span aria-hidden="true">↘</span></div>
            <dl>
              <div><dt>{en ? "Description" : "Descrição"}</dt><dd>{brief.description}</dd></div>
              <div><dt>{en ? "My role" : "Atuação"}</dt><dd>{brief.contribution}</dd></div>
              <div className="case-brief-results"><dt>{en ? "Results" : "Resultados"}</dt><dd>{brief.results}</dd></div>
            </dl>
          </section>}
          {meta.length > 0 && (
            <dl className="case-meta">
              {meta.map((m) => (
                <div key={m.label} className="case-meta-item">
                  <dt>{m.label}</dt>
                  <dd>{m.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </header>

        {copy.credits && (
          <CreditsAndRecs
            credits={copy.credits}
            recsIntro={sections[0]?.items.filter((item) => !item.startsWith("[[")) ?? []}
            media={copy.media ?? []}
            lang={lang}
            lineNumber={station.lineId.replace("L", "").padStart(2, "0")}
          />
        )}

        {!copy.credits && intro.length > 0 && (
          <div className="case-intro">
            {intro.map((item, j) =>
              renderCaseItem(item, j, openImage, en ? "Expand image" : "Ampliar imagem"),
            )}
          </div>
        )}

        {!copy.credits && sections.length > 0 && (
        <div className={`case-body${station.lineId === "L1" ? " case-body--plain" : ""}`}>
          {station.lineId !== "L1" && <CaseWheelNav items={navItems} activeId={activeId} onSelect={jumpTo} lang={lang} />}

          <div className="case-sections">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="case-section">
                <div className="case-section-head">
                  <span className="case-section-index">{String(i + 1).padStart(2, "0")}</span>
                  <h2>{s.label}</h2>
                </div>
                <div className="case-section-body">
                  {s.items.map((item, j) => item.startsWith("[[placeholder:") || item.startsWith("[[img:") ? null : renderCaseItem(item, j, openImage, en ? "Expand image" : "Ampliar imagem"))}
                </div>
                <CaseProcess lineId={station.lineId} section={s.id} lang={lang} />
                {extras?.Visual && !(extras.visualExcluded ?? []).includes(s.id) && (
                  <extras.Visual key={`${s.id}:${lang}`} section={s.id} lang={lang} />
                )}
                {s.items.some(item => item.startsWith("[[img:")) && <div className="case-gallery">{s.items.map((item, j) => item.startsWith("[[img:") ? renderCaseItem(item, j, openImage, en ? "Expand image" : "Ampliar imagem") : null)}</div>}
                {s.items.map((item, j) => item.startsWith("[[placeholder:") ? renderCaseItem(item, j, openImage, en ? "Expand image" : "Ampliar imagem") : null)}
              </section>
            ))}
          </div>
        </div>
        )}

        {!copy.credits && copy.media && copy.media.length > 0 && (
          <div className="case-media">
            <StationMediaGrid media={copy.media} lang={lang} />
          </div>
        )}

        <footer className="case-station-end">
          <img src={posterUrlFor(station.slug)} alt={en ? `The ${copy.title} station` : `A estação ${copy.title}`} loading="lazy" />
          <div className="case-station-end-content">
            <nav className="case-signs case-signs--top" aria-label={en ? "Map" : "Mapa"}>
              <Link to="/" className="case-sign case-sign--map">
                <SignArrow angle={180} />
                <span className="case-sign-text"><small>{en ? "Back to" : "Voltar ao"}</small><strong>{en ? "Map" : "Mapa"}</strong></span>
              </Link>
            </nav>
            <h2>{copy.title}</h2>
            <nav className="case-signs case-signs--pair" aria-label={en ? "Continue exploring" : "Continue explorando"}>
              {prevStation && prevStation.slug !== station.slug && (
                <Link to="/station/$stationId" params={{ stationId: prevStation.slug }} className="case-sign case-sign--prev">
                  <SignArrow angle={-135} />
                  <span className="case-sign-text"><small>{en ? "Previous project" : "Projeto anterior"}</small><strong>{getStationContent(prevStation.lineId, lang)?.title}</strong></span>
                  <SignBadge station={prevStation} />
                </Link>
              )}
              {nextStation && nextStation.slug !== station.slug && (
                <Link to="/station/$stationId" params={{ stationId: nextStation.slug }} className="case-sign case-sign--next">
                  <SignBadge station={nextStation} />
                  <span className="case-sign-text"><small>{en ? "Next project" : "Próximo projeto"}</small><strong>{getStationContent(nextStation.lineId, lang)?.title}</strong></span>
                  <SignArrow angle={0} />
                </Link>
              )}
            </nav>
          </div>
        </footer>
        {!copy.credits && copy.links && copy.links.length > 0 && (
          <div className="case-links">
            {copy.links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target={link.url.startsWith("http") ? "_blank" : undefined}
                rel={link.url.startsWith("http") ? "noopener noreferrer" : undefined}
                className="station-link"
              >
                {link.label}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            ))}
          </div>
        )}
      </div>
      {lightbox !== null && caseImages[lightbox] && (
        <CaseLightbox
          images={caseImages}
          index={lightbox}
          lang={lang}
          onClose={() => setLightbox(null)}
          onNavigate={setLightbox}
        />
      )}
    </main>
  );
}

/** NYC-style pointy arrow, same glyph as the map menu. */
function SignArrow({ angle }: { angle: number }) {
  return (
    <svg className="case-sign-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="butt" strokeLinejoin="miter" aria-hidden="true">
      <g transform={`rotate(${angle} 12 12)`}>
        <path d="M4 12h15M13 6l6 6-6 6" />
      </g>
    </svg>
  );
}

function SignBadge({ station }: { station: PortfolioStation }) {
  const line = transitLines.find((l) => l.id === station.lineId);
  return (
    <span className="case-sign-badge" style={{ background: line ? `var(--${line.color})` : station.accent }} aria-hidden="true">
      {line?.shortName ?? station.lineId.replace("L", "").padStart(2, "0")}
    </span>
  );
}

function CreditsAndRecs({
  credits,
  recsIntro,
  media,
  lang,
  lineNumber,
}: {
  credits: StationCredit[];
  recsIntro: string[];
  media: StationMedia[];
  lang: ContentLang;
  lineNumber: string;
}) {
  const en = lang === "en";
  return (
    <div className="credits">
      <section className="credits-block" aria-labelledby="credits-liner">
        <div className="credits-head">
          <span className="credits-eyebrow">
            {en ? "Side A · Liner notes" : "Lado A · Encarte"} <i aria-hidden="true" /> {en ? "Line" : "Linha"} {lineNumber}
          </span>
          <h2 id="credits-liner">{en ? "Credits" : "Créditos"}</h2>
        </div>
        <ol className="credits-grid">
          {credits.map((credit, index) => (
            <li key={credit.name} className="credits-card">
              <span className="credits-card-top">
                <span className="credits-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="credits-role">{credit.role}</span>
              </span>
              <strong className="credits-name">{credit.name}</strong>
              <p>{credit.note}</p>
              {credit.url && (
                <a href={credit.url} target="_blank" rel="noopener noreferrer" className="credits-link">
                  {credit.urlLabel ?? credit.name}
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              )}
            </li>
          ))}
        </ol>
      </section>

      {media.length > 0 && (
        <section className="credits-block credits-recs" aria-labelledby="credits-recs">
          <div className="credits-head">
            <span className="credits-eyebrow">
              {en ? "Side B · Recs" : "Lado B · Recs"} <i aria-hidden="true" /> {media.length} {en ? "picks" : "indicações"}
            </span>
            <h2 id="credits-recs">{en ? "Recommendations" : "Recomendações"}</h2>
            {recsIntro.map((line) => (
              <p key={line} className="credits-intro">{line}</p>
            ))}
          </div>
          <StationMediaGrid media={media} lang={lang} />
        </section>
      )}
    </div>
  );
}

function StationMediaGrid({ media, lang }: { media: StationMedia[]; lang: ContentLang }) {
  const groups = groupMedia(media);
  const labels = MEDIA_CATEGORY_LABELS[lang];
  const spotifySections = [
    { key: "songs" as const, items: groups.songs },
    { key: "albums" as const, items: groups.albums },
  ];
  const cardSections = [
    { key: "films" as const, items: groups.films },
    { key: "books" as const, items: groups.books },
  ];

  return (
    <div className="station-media">
      {spotifySections.map(
        (section) =>
          section.items.length > 0 && (
            <section key={section.key} className="station-media-section">
              <h2 className="station-media-heading">{labels[section.key]}</h2>
              <div className="spotify-embed-stack">
                {section.items.map(
                  (item) =>
                    item.type === "spotify" && (
                      <iframe
                        key={item.src}
                        className="spotify-embed"
                        title={mediaLabel(item)}
                        src={item.src}
                        width="100%"
                        height="152"
                        frameBorder="0"
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy"
                      />
                    ),
                )}
              </div>
            </section>
          ),
      )}

      {cardSections.map(
        (section) =>
          section.items.length > 0 && (
            <section key={section.key} className="station-media-section">
              <h2 className="station-media-heading">{labels[section.key]}</h2>
              <div className="recommendation-grid">
                {section.items.map(
                  (item) =>
                    (item.type === "film" || item.type === "book") && (
                      <a
                        key={item.url}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`recommendation-card recommendation-card-${item.type}`}
                      >
                        {item.type === "film" ? (
                          <img
                            src={item.image}
                            alt={item.imageAlt}
                            className="recommendation-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div
                            className="recommendation-cover recommendation-book-cover"
                            aria-hidden="true"
                          >
                            <span>DESIGN</span>
                            <strong>COMO ATITUDE</strong>
                          </div>
                        )}
                        <div className="recommendation-info">
                          <span className="recommendation-kind">{labels[section.key]}</span>
                          <h3>{item.title}</h3>
                          <p className="recommendation-meta">{item.meta}</p>
                          <p>{item.description}</p>
                        </div>
                      </a>
                    ),
                )}
              </div>
            </section>
          ),
      )}
    </div>
  );
}
