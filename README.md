# Four Keeps

A portrait-first, single-player D&D-inspired fantasy RPG with an AI Dungeon Master and deterministic game engine.

## Current milestone

**Milestone 1 — Application shell.** This is a text-only UI prototype, not yet a playable game. The DM input deliberately does not send requests. Campaign data is preview-only and is not persisted.

## Development

Requires Node.js 22+.

```sh
npm install
npm run dev
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

Vite is configured for the GitHub Pages subpath `/four-keeps/`.

## Architecture

- `src/app`: application shell and navigation
- `src/game`: typed game models and eventually deterministic rules
- `src/styles.css`: Tailwind and theme styling
- `tests/e2e`: browser smoke tests

Future milestones add Supabase Auth/PostgreSQL, serverless DM orchestration, companion behavior, and tactical maps. No API keys belong in the browser.
