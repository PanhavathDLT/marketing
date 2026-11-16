export interface RewardItem {
  id: number;
  title: string;
  points: number;
  imageUrl?: string;
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RewardItemPayload {
  title: string;
  points: number;
  imageUrl?: string;
  stock: number;
  isActive: boolean;
}

export type RedemptionStatus = "PENDING_PICKUP" | "COLLECTED" | "EXPIRED";

export interface Redemption {
  id: number;
  status: RedemptionStatus;
  points: number;
  redeemedAt: string;
  customer: {
    id: number;
    name: string | null;
    phone: string | null;
  };
  rewardItem: {
    id: number;
    title: string;
    imageUrl?: string | null;
  };
}
