import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import { gelenDersler } from './scripts/gelen-dersler.mjs';

export default defineConfig({
  integrations: [gelenDersler(), mdx(), react(), tailwind({ applyBaseStyles: false })],
  redirects: {
    '/deeper-look': '/tefsir',
    '/deeper-look/sure/[surah]': '/tefsir/sure/[surah]',
    '/deeper-look/[surah]/[slug]': '/tefsir/[surah]/[slug]',
  },
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
});
