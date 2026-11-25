import type { CampaignPreview, View } from './types';

export const views: readonly View[] = ['adventure', 'party', 'journal', 'map'];

export const previewCampaign: CampaignPreview = {
  id: 'prototype-preview',
  title: 'The Forgotten Keep',
  location: 'Frontier Village',
  partyCount: 4,
  status: 'prototype',
};

export function isView(value: string): value is View {
  return views.some((view) => view === value);
}
