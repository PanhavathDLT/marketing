export interface Tier {
  id: number;
  name: string;
  minPoints: number;
  iconUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TierPayload {
  name: string;
  minPoints: number;
  iconUrl?: string;
}
