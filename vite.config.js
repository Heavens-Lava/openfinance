import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function githubPagesCname() {
  return {
    name: 'github-pages-cname',
    writeBundle(outputOptions) {
      const cname = process.env.VITE_CNAME || 'openfinance.jeffreymacy.com';
      const outputDir = outputOptions.dir || 'dist';
      fs.writeFileSync(path.resolve(outputDir, 'CNAME'), `${cname}\n`);
    },
  };
}

export default defineConfig({
  plugins: [react(), githubPagesCname()],
  base: process.env.VITE_BASE || '/',
});
