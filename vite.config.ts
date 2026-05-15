import { defineConfig } from 'vite';

/**
 * GitHub Pages serves project sites under `https://<user>.github.io/<repo>/`,
 * not at domain root. In production we use relative `base` so built asset URLs
 * resolve correctly for any repo name without editing config. Dev server keeps
 * `base: '/'` so `npm run dev` behaves normally.
 */
export default defineConfig(({ command }) => ({
  root: '.',
  publicDir: 'public',
  base: command === 'serve' ? '/' : './',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5173,
  },
}));
