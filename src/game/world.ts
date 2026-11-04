export type Evidence = 'confirmed' | 'reported' | 'rumor';
export type QuestStatus = 'open' | 'completed' | 'failed';
export interface NPCRecord { id: string; name: string; role: string; location: string; relationship: string; notes: string[] }
export interface PlaceRecord { id: string; name: string; description: string; notes: string[] }
export interface ClueRecord { id: string; text: string; evidence: Evidence; source: string }
export interface QuestRecord { id: string; title: string; status: QuestStatus; objective: string; notes: string[] }
export interface WorldState { npcs: NPCRecord[]; places: PlaceRecord[]; clues: ClueRecord[]; quests: QuestRecord[] }
export const emptyWorld = (): WorldState => ({ npcs: [], places: [], clues: [], quests: [] });
const clean = (value: unknown, max = 220) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const list = (value: unknown) => Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string').slice(0, 12).map(x => clean(x)).filter(Boolean) : [];
const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
export function normalizeWorld(value: unknown): WorldState {
  const v = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const rows = (name: string) => Array.isArray(v[name]) ? v[name].filter(x => x && typeof x === 'object').slice(0, 60) as Record<string, unknown>[] : [];
  return {
    npcs: rows('npcs').map(x => ({ id: key(clean(x.name)), name: clean(x.name, 80), role: clean(x.role), location: clean(x.location), relationship: clean(x.relationship), notes: list(x.notes) })).filter(x => x.id),
    places: rows('places').map(x => ({ id: key(clean(x.name)), name: clean(x.name, 80), description: clean(x.description), notes: list(x.notes) })).filter(x => x.id),
    clues: rows('clues').map(x => ({ id: key(clean(x.text)), text: clean(x.text), evidence: (x.evidence === 'confirmed' || x.evidence === 'reported' ? x.evidence : 'rumor') as Evidence, source: clean(x.source, 80) })).filter(x => x.id),
    quests: rows('quests').map(x => ({ id: key(clean(x.title)), title: clean(x.title, 80), status: (x.status === 'completed' || x.status === 'failed' ? x.status : 'open') as QuestStatus, objective: clean(x.objective), notes: list(x.notes) })).filter(x => x.id),
  };
}
function mergeRows<T extends { id: string }>(oldRows: T[], incoming: T[], merge: (old: T, next: T) => T): T[] {
  const result = [...oldRows];
  for (const item of incoming) {
    const index = result.findIndex(x => x.id === item.id);
    if (index < 0) result.push(item); else result[index] = merge(result[index], item);
  }
  return result.slice(-60);
}
const mergeNotes = (a: string[], b: string[]) => [...new Set([...a, ...b])].slice(-12);
export function mergeWorld(old: WorldState | undefined, updates: unknown): WorldState {
  const a = normalizeWorld(old ?? emptyWorld()), b = normalizeWorld(updates);
  return {
    npcs: mergeRows(a.npcs, b.npcs, (x,y) => ({ ...x, role: y.role || x.role, location: y.location || x.location, relationship: y.relationship || x.relationship, notes: mergeNotes(x.notes,y.notes) })),
    places: mergeRows(a.places,b.places,(x,y) => ({ ...x, description: y.description || x.description, notes: mergeNotes(x.notes,y.notes) })),
    clues: mergeRows(a.clues,b.clues,(x,y) => ({ ...x, evidence: x.evidence === 'confirmed' ? 'confirmed' : y.evidence, source: y.source || x.source })),
    quests: mergeRows(a.quests,b.quests,(x,y) => ({ ...x, status: y.status, objective: y.objective || x.objective, notes: mergeNotes(x.notes,y.notes) })),
  };
}
