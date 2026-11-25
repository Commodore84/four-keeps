import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths work on Vercel's root domain and GitHub Pages' /four-keeps/ path.
  base: './',
  test: { environment: 'node', include: ['src/**/*.test.ts','tests/*.test.ts'],
    // Preserve non-Rogue class tests in source, but do not run them during Rogue-first development.
    exclude: process.env.FOUR_KEEPS_ALL_CLASSES_TESTS==='1'?[]:[
      'src/game/creation-wizard-preparation.test.ts',
      'src/game/imported-warlock.test.ts',
      'src/game/imported-wizard-combat.test.ts',
      'src/game/imported-wizard.test.ts',
    ] },
});
