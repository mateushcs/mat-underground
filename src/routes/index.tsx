import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { TransitMap } from "@/components/TransitMap";
import { MapLoadingScreen } from "@/components/MapLoadingScreen";
import { requestActiveStation } from "@/components/splatStageBus";
import { getStoredLanguage, type ContentLang } from "@/lib/language";

const READING_LABELS: Record<
  ContentLang,
  { skip: string; button: string; aria: string; description: string }
> = {
  pt: {
    skip: "Pular para a versão em texto acessível",
    button: "Modo leitura",
    aria: "Abrir a versão em texto, acessível para leitores de tela",
    description:
      "Existe uma versão em texto deste portfólio, feita para leitores de tela e leitura linear.",
  },
  en: {
    skip: "Skip to the accessible text version",
    button: "Reading mode",
    aria: "Open the accessible, screen-reader-friendly text version",
    description:
      "A text version of this portfolio is available for screen readers and linear reading.",
  },
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "mat underground club" },
      {
        name: "description",
        content:
          "Personal portfolio as a schematic transit map, with each active line pointing to a project path.",
      },
      { property: "og:title", content: "mat underground club" },
      {
        property: "og:description",
        content: "A personal portfolio drawn as a life map of paths and projects.",
      },
    ],
  }),
  component: Index,
});

function ReadingEntry() {
  const [lang, setLang] = useState<ContentLang>("pt");
  useEffect(() => setLang(getStoredLanguage()), []);
  const labels = READING_LABELS[lang];

  return (
    <>
      <p id="reading-entry-description" className="sr-only">
        {labels.description}
      </p>
      <Link
        to="/leitura"
        className="reading-skip-link"
        aria-describedby="reading-entry-description"
      >
        {labels.skip}
      </Link>
      <Link
        to="/leitura"
        className="reading-mode-btn"
        aria-label={labels.aria}
        aria-describedby="reading-entry-description"
      >
        <BookOpen className="h-4 w-4" aria-hidden="true" />
        {labels.button}
      </Link>
    </>
  );
}

function Index() {
  useEffect(() => {
    requestActiveStation(null);
  }, []);

  return (
    <>
      <ReadingEntry />
      <TransitMap />
      <MapLoadingScreen />
    </>
  );
}
