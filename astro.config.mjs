import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  integrations: [vue(), tailwind()],
  output: 'server', // Enable server-side rendering for API routes
  adapter: vercel(), // Vercel adapter for deployment
});
