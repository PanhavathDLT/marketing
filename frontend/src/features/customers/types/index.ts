export interface ReferredBy {
  id: number;
  name: string;
  referralCode: string;
}

export interface Customer {
  id: number;
  userId: number;
  name: string | null;
  phone: string;
  points: number;
  tier: string;
  loanCycleCount: number;
  referralCode: string;
  referredBy: ReferredBy | null;
  joinedAt: string;
}
