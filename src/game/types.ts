export type View = 'adventure' | 'party' | 'journal' | 'magic-items' | 'map' | 'settings' | 'development';
export interface CampaignPreview {
  id: string;
  title: string;
  location: string;
  partyCount: number;
  status: 'prototype';
}
