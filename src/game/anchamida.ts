import source from './data/anchamida-locations.json';

export type AnchamidaLocation = {
  id: string;
  type: 'city' | 'discovery';
  name: string;
  x: number;
  y: number;
  notes?: string;
  confirmed?: boolean;
};

export const anchamidaLocations = source.locations as AnchamidaLocation[];
export const anchamidaDimensions = { width: source.imageWidth, height: source.imageHeight } as const;
export const anchamidaStartId = 'city-dasahi';

export function anchamidaLocation(id: string): AnchamidaLocation | undefined {
  return anchamidaLocations.find(location => location.id === id);
}

/** Only the starting city is revealed by default; discovery state belongs to a campaign. */
export function visibleAnchamidaLocations(discoveredIds: readonly string[] = []): AnchamidaLocation[] {
  const visible = new Set([anchamidaStartId, ...discoveredIds]);
  return anchamidaLocations.filter(location => visible.has(location.id));
}

/** Coordinates are percentages of the original artwork and survive image downscaling. */
export function anchamidaPixelPosition(location: AnchamidaLocation, width = anchamidaDimensions.width, height = anchamidaDimensions.height) {
  return { x: width * location.x / 100, y: height * location.y / 100 };
}

/** A blank name or description does not create an implicit fixed identity. */
export function anchamidaDMConstraints(location: AnchamidaLocation) {
  return { name: location.name.trim() || null, terrain: location.notes?.trim() || null };
}
