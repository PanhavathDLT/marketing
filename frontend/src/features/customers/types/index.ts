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
  referralCode: string;
  referredBy: ReferredBy | null;
  joinedAt: string;
}
