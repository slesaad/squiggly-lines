import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';

export default defineConfig({
  site: 'https://slesaad.github.io',
  base: '/squiggly-lines',
  integrations: [mdx(), sitemap(), svelte()],
});
