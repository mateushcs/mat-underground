import { flushSync } from "react-dom";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { CONTENT_LINE_ORDER, readingIntro } from "@/data/portfolioContent";
import { getStationContent } from "@/data/caseEditorial";
import { groupMedia, mediaHref, mediaLabel, MEDIA_CATEGORY_LABELS } from "@/lib/mediaCategories";
import {
  getStoredLanguage,
  htmlLang,
  LANGUAGES,
  setStoredLanguage,
  type ContentLang,
} from "@/lib/language";
import { getStoredTheme, setStoredTheme, type MapTheme, withThemeFade } from "@/lib/theme";

const READING_COPY: Record<
  ContentLang,
  {
    skip: string;
    language: string;
    themeLight: string;
    themeDark: string;
    external: string;
  }
> = {
  pt: {
    skip: "Pular para o conteúdo",
    language: "Idioma",
    themeLight: "Mudar para modo claro",
    themeDark: "Mudar para modo escuro",
    external: "Abre em nova aba",
  },
  en: {
    skip: "Skip to content",
    language: "Language",
    themeLight: "Switch to light mode",
    themeDark: "Switch to dark mode",
    external: "Opens in a new tab",
  },
};

export const Route = createFileRoute("/leitura")({
  head: () => ({
    meta: [
      { title: "Modo leitura | mat underground club" },
      {
        name: "description",
        content:
          "Versão em texto, acessível para leitores de tela, de todo o conteúdo do portfólio.",
      },
    ],
  }),
  component: ReadingMode,
});

function ReadingMode() {
  // Server defaults first; stored choices are applied after hydration below.
  const [lang, setLang] = useState<ContentLang>("pt");
  const [theme, setTheme] = useState<MapTheme>("dark");

  useEffect(() => {
    setLang(getStoredLanguage());
    setTheme(getStoredTheme());
  }, []);

  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = htmlLang(lang);
    return () => {
      document.documentElement.lang = previous;
    };
  }, [lang]);

  const intro = readingIntro[lang];
  const copy = READING_COPY[lang];

  const chooseLanguage = (next: ContentLang) => {
    setLang(next);
    setStoredLanguage(next);
  };

  const toggleTheme = () => {
    withThemeFade(() =>
      flushSync(() =>
        setTheme((prev) => {
          const next: MapTheme = prev === "dark" ? "light" : "dark";
          setStoredTheme(next);
          return next;
        }),
      ),
    );
  };

  return (
    <main className="reading" id="conteudo" data-reading-theme={theme} suppressHydrationWarning>
      <a className="reading-skip" href="#leitura-conteudo">
        {copy.skip}
      </a>

      <header className="reading-header">
        <h1>{intro.heading}</h1>

        <nav className="reading-controls" aria-label={copy.language}>
          <div className="reading-langs" role="group" aria-label={copy.language}>
            {LANGUAGES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => chooseLanguage(item.id)}
                aria-pressed={lang === item.id}
                className={lang === item.id ? "is-active" : ""}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="reading-theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? copy.themeLight : copy.themeDark}
            aria-pressed={theme === "light"}
          >
            {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </button>
          <Link to="/" className="reading-back">
            {intro.back}
          </Link>
        </nav>
      </header>

      <div id="leitura-conteudo">
        {CONTENT_LINE_ORDER.map((lineId) => {
          const station = getStationContent(lineId, lang);
          if (!station) return null;
          const creditBookLink =
            lineId === "L7"
              ? station.links?.find((link) => link.label.toLowerCase().includes("one metro world"))
              : undefined;
          const stationLinks =
            station.links?.filter((link) => !(creditBookLink && link.url === creditBookLink.url)) ??
            [];
          return (
            <article key={lineId} className="reading-section">
              <p className="reading-section-index">{lineId.replace("L", "").padStart(2, "0")}</p>
              <h2>{station.title}</h2>
              {station.header && (
                <p className="reading-section-meta">
                  {[
                    station.header.client && station.header.client !== station.header.company
                      ? station.header.client
                      : null,
                    station.header.company,
                    station.header.period,
                    station.header.role,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              {station.body.map((paragraph, i) => {
                if (paragraph.startsWith("[[placeholder:")) {
                  const [title, description] = paragraph.slice(14, -2).split("|");
                  return <p key={i}>{title} — {description}</p>;
                }
                if (paragraph.startsWith("## ")) {
                  return (
                    <h3 key={i} className="reading-subhead">
                      {paragraph.slice(3)}
                    </h3>
                  );
                }
                if (paragraph.startsWith("[[img:")) {
                  const [src, alt] = paragraph.slice(6, -2).split("|");
                  return (
                    <figure key={i} className="reading-photo">
                      <a href={src} target="_blank" rel="noopener noreferrer" aria-label={lang === "en" ? `Open original image: ${alt ?? ""}` : `Abrir imagem original: ${alt ?? ""}`}>
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
                      </a>
                    </figure>
                  );
                }
                const showCreditBookLink =
                  !!creditBookLink && paragraph.toLowerCase().includes("one metro world");
                return (
                  <Fragment key={i}>
                    <p>{paragraph}</p>
                    {showCreditBookLink && (
                      <p className="reading-inline-link">
                        <a href={creditBookLink.url} target="_blank" rel="noopener noreferrer">
                          {lang === "en" ? "Read One Metro World" : "Ler One Metro World"}
                          <span className="sr-only"> ({copy.external})</span>
                        </a>
                      </p>
                    )}
                  </Fragment>
                );
              })}
              {stationLinks.length > 0 && (
                <ul className="reading-link-list">
                  {stationLinks.map((link) => {
                    const external = link.url.startsWith("http");
                    return (
                      <li key={link.url}>
                        <a
                          href={link.url}
                          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        >
                          {link.label}
                          {external && <span className="sr-only"> ({copy.external})</span>}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
              {station.media && station.media.length > 0 && (
                <div className="reading-media-groups">
                  {(["songs", "albums", "films", "books"] as const).map((category) => {
                    const items = groupMedia(station.media ?? [])[category];
                    if (items.length === 0) return null;
                    return (
                      <section key={category} className="reading-media-group">
                        <h3 className="reading-subhead">{MEDIA_CATEGORY_LABELS[lang][category]}</h3>
                        <ul className="reading-link-list">
                          {items.map((item) => {
                            const href = mediaHref(item);
                            return (
                              <li key={href}>
                                <a href={href} target="_blank" rel="noopener noreferrer">
                                  {mediaLabel(item)}
                                  <span className="sr-only"> ({copy.external})</span>
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}
