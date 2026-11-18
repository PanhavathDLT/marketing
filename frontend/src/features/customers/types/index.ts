export interface ReferredBy {
  id: number;
  name: string;
  referralCode: string;
}

export interface Customer {
  id: number;
  userId: number;
  name: string;
  phone: string;
  points: number;
  tier: string;
  loanCount: number;
  referralCode: string;
  referredBy: ReferredBy | null;
  joinedAt: string;
}
