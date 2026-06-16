import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Build for Vercel from our own CI. Lovable's own sandbox builds still force
  // Cloudflare; this preset only applies outside it (i.e. on Vercel).
  nitro: { preset: "vercel" },

  tanstackStart: {
    server: { entry: "server" },
  },
});