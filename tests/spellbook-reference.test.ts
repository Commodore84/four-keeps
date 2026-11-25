import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Guard the player spellbook against missing metadata as new spells are added.
const app = readFileSync(new URL('../src/app/App.tsx', import.meta.url), 'utf8');
const between = (start: string, end: string) => app.slice(app.indexOf(start), app.indexOf(end));
const metadata = between('const spellSheetMetadata:', 'const spellSummaries:');
const summaries = between('const spellSummaries:', 'const tabs =');
const names = (source: string) => [...source.matchAll(/^\s+"([^"]+)":/gm)].map(match => match[1]);

describe('spellbook reference', () => {
  it('records casting metadata for every supported spell', () => {
    const supported = names(summaries);
    expect(supported.length).toBeGreaterThanOrEqual(47);
    expect(new Set(names(metadata))).toEqual(new Set(supported));
  });

  it('provides expandable inline details including components and duration', () => {
    expect(app).toContain('aria-expanded={selectedSpell===spell}');
    expect(app).toContain('spellSheetMetadata[spell].components');
    expect(app).toContain('spellSheetMetadata[spell].duration');
    expect(app).toContain('spellSheetMetadata[spell].range');
    expect(app).toContain('spellSheetMetadata[spell].time');
    expect(app).toContain('selectedSpell===spell&&<div');
  });
});
