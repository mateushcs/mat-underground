import type { ContentLang, StationMedia } from "@/data/portfolioContent";

export type MediaCategory = "songs" | "albums" | "films" | "books";

export const MEDIA_CATEGORY_LABELS: Record<ContentLang, Record<MediaCategory, string>> = {
  pt: {
    songs: "Músicas",
    albums: "Álbuns",
    films: "Filmes",
    books: "Livros",
  },
  en: {
    songs: "Songs",
    albums: "Albums",
    films: "Films",
    books: "Books",
  },
};

const SPOTIFY_TITLES: Record<string, string> = {
  "1NloZPigydBzWZe5tZIE66": "Odsjaji",
  "7MAgib7aTXE2nKqRtGonpM": "I Like You Best - Cover",
  "7FQmCNBt5MgxNXSv2qhCzm": "Lara Kroft",
  "2qQU7mfSkbKAF5RJJUlgq5": "WHY NOW?",
  "6xeyjWgntCN8UQKjAOzT7l": "Find You",
  "3nmHojsXc76NvGmpGsNGmi": "wildwoman",
  "3o4mFQ6OMlAwxxjdvWSrPI": "Running Back To You",
  "0MOWqwwatV0LXDxhBZg5qO": "Florescence",
};

function spotifyId(src: string) {
  return src.match(/\/(?:track|album)\/([^?]+)/)?.[1] ?? null;
}

export function mediaHref(item: StationMedia) {
  if (item.type !== "spotify") return item.url;
  return item.src
    .replace("https://open.spotify.com/embed/", "https://open.spotify.com/")
    .replace(/\?.*$/, "");
}

export function mediaLabel(item: StationMedia) {
  if (item.type !== "spotify") return item.title;
  const id = spotifyId(item.src);
  return id ? (SPOTIFY_TITLES[id] ?? item.title) : item.title;
}

export function mediaCategory(item: StationMedia): MediaCategory {
  if (item.type === "film") return "films";
  if (item.type === "book") return "books";
  return item.src.includes("/album/") ? "albums" : "songs";
}

export function groupMedia(media: StationMedia[]) {
  return {
    songs: media.filter((item) => mediaCategory(item) === "songs"),
    albums: media.filter((item) => mediaCategory(item) === "albums"),
    films: media.filter((item) => item.type === "film"),
    books: media.filter((item) => item.type === "book"),
  };
}
