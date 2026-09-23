// Every station shows a baked still in /public/stations/posters/<slug>.webp.
// These stills are pre-rendered from the splat scenes; the site no longer loads
// WebGL at runtime (the 3D mode was removed for performance).
export function posterUrlFor(slug: string): string {
  return `/stations/posters/${slug}.webp`;
}
