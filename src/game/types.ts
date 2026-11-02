export type View = 'adventure' | 'party' | 'journal' | 'map';
export interface CampaignPreview {
  id: string;
  title: string;
  location: string;
  partyCount: number;
  status: 'prototype';
}
