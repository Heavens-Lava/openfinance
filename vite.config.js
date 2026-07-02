import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Served from https://<user>.github.io/openfinance/ on GitHub Pages.
  base: process.env.GITHUB_ACTIONS ? '/openfinance/' : '/',
});
