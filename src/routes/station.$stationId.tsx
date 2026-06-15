import { createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Fragment, lazy, Suspense, useEffect, useState, type CSSProperties } from "react";
import { useRouteTransition } from "@/components/RouteTransition";
import {
  portfolioStationBySlug,
  portfolioStations,
  type PortfolioStation,
} from "@/data/portfolioStations";
import { getStationContent, type StationMedia } from "@/data/portfolioContent";
import { getStoredLanguage, htmlLang, type ContentLang } from "@/lib/language";
import { requestActiveStation } from "@/components/splatStageBus";
import { groupMedia, mediaLabel, MEDIA_CATEGORY_LABELS } from "@/lib/mediaCategories";

const StationSplatLayer = lazy(() =>
  import("@/components/StationSplatLayer").then((module) => ({
    default: module.StationSplatLayer,
  })),
);

export const Route = createFileRoute("/station/$stationId")({
  beforeLoad: ({ params }) => {
    if (!portfolioStationBySlug[params.stationId]) throw notFound();
  },
  head: ({ params }) => {
    const station = portfolioStationBySlug[params.stationId] ?? portfolioStations[0];
    const copy = getStationContent(station.lineId, "pt");
    const pageTitle = (copy?.title ?? "estacao").toLocaleLowerCase("pt-BR");
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
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const tune = !!params?.has("tune");
  const posterMode = !!params?.has("__poster");
  const useOwnSplat = tune || posterMode;
  const [splatMounted, setSplatMounted] = useState(false);
  const [lang, setLang] = useState<ContentLang>("pt");
  const { go } = useRouteTransition();

  useEffect(() => {
    const stored = getStoredLanguage();
    setLang(stored);
    document.documentElement.lang = htmlLang(stored);
  }, []);

  useEffect(() => {
    if (!useOwnSplat) return;
    if (new URLSearchParams(window.location.search).has("__dissolvePreview")) return;
    setSplatMounted(true);
  }, [station.slug, useOwnSplat]);

  useEffect(() => {
    if (useOwnSplat) return;
    requestActiveStation({ station, interactive: true });
    return () => requestActiveStation(null);
  }, [station, useOwnSplat]);

  const copy = getStationContent(station.lineId, lang) ?? getStationContent(station.lineId, "pt");
  const creditBookLink =
    station.lineId === "L7"
      ? copy?.links?.find((link) => link.label.toLowerCase().includes("one metro world"))
      : undefined;
  const stationLinks =
    copy?.links?.filter((link) => !(creditBookLink && link.url === creditBookLink.url)) ?? [];

  if (posterMode) {
    return (
      <main
        className="fixed inset-0 bg-black"
        style={{ "--station-accent": station.accent } as CSSProperties}
      >
        <StationSplatLayer station={station} tune={false} />
      </main>
    );
  }

  return (
    <main
      data-transition-surface="station"
      className="station-page relative min-h-screen overflow-x-hidden font-sans text-[#e5e1d6]"
      style={
        {
          "--station-accent": station.accent,
          backgroundColor: useOwnSplat ? "#1e2124" : "transparent",
        } as CSSProperties
      }
    >
      {useOwnSplat && splatMounted && (
        <Suspense fallback={null}>
          <StationSplatLayer station={station} tune={tune} />
        </Suspense>
      )}
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
                  <img src={src} alt={alt ?? ""} loading="lazy" />
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
