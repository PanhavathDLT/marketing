export interface Tier {
  id: number;
  name: string;
  rewardPoints: number;
  minLoanCount: number;
  iconUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TierPayload {
  name: string;
  rewardPoints: number;
  minLoanCount: number;
  iconUrl?: string;
}
