import { defineConfig } from 'vite';

// host: true exposes the dev server on the LAN / Tailscale IP too.
export default defineConfig({
  server: { host: true },
  // Itch.io serves an uploaded HTML5 build from inside a subdirectory, not domain root --
  // Vite's default absolute asset paths (/assets/...) 404 there, which is exactly what a
  // black screen with no visible error looks like (canvas exists, nothing ever loads into
  // it). Relative paths resolve correctly regardless of what subdirectory it's served from.
  base: './',
});
