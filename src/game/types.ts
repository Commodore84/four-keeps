export type View = 'adventure' | 'party' | 'journal' | 'map' | 'settings';
export interface CampaignPreview {
  id: string;
  title: string;
  location: string;
  partyCount: number;
  status: 'prototype';
}
