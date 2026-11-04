// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://vitalikryzhenkous.github.io',
  base: '/portfolio',
  trailingSlash: 'ignore',
  integrations: [react(), mdx(), sitemap()],
  // renamed cases: old URLs keep working
  redirects: {
    '/work/status-board': '/portfolio/work/uptime/',
    '/work/interview-gym': '/portfolio/work/interview-bootcamp/',
  },
});
