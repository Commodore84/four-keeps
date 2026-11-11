import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths work on Vercel's root domain and GitHub Pages' /four-keeps/ path.
  base: './',
  test: { environment: 'node', include: ['src/**/*.test.ts','tests/*.test.ts'] },
});
