import { defineConfig } from 'vite';

// host: true exposes the dev server on the LAN / Tailscale IP too.
export default defineConfig({
  server: { host: true },
});
