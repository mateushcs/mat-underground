import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Build for Vercel from our own CI. Lovable's own sandbox builds still force
  // Cloudflare; this preset only applies outside it (i.e. on Vercel).
  nitro: {
    preset: "vercel",
    routeRules: {
      "/subway.sog": {
        headers: { "cache-control": "public, max-age=31536000, immutable" },
      },
      "/stations/**.sog": {
        headers: { "cache-control": "public, max-age=31536000, immutable" },
      },
    },
  },

  tanstackStart: {
    server: { entry: "server" },
  },
});
