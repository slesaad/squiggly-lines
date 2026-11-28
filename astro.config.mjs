import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';

export default defineConfig({
  site: 'https://squiggles.slesa.com.np',
  integrations: [mdx(), sitemap(), svelte()],
  redirects: {
    // The 2021 birthday page lived at /bday before the move to Astro.
    '/bday': '/posts/bday-2021/',
  },
});
