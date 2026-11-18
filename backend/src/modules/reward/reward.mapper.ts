import { CustomerProfile, RewardItem, TierConfig } from '@prisma/client';
import { RedemptionWithItem, AdminRedemptionRow } from './reward.repository.js';

export type PointsDTO = {
  points: number;
  tier: string;
  tierName: string;
  nextTierName: string | null;
  loanCycleCount: number;
  loansToNextTier: number | null;
};

export type StoreItemDTO = {
  id: number;
  title: string;
  points: number;
  imageUrl: string | null;
};

export type RedemptionDTO = {
  id: number;
  title: string;
  points: number;
  imageUrl: string | null;
  status: string;
  redeemedAt: string;
};

export function toPointsDTO(profile: CustomerProfile, tiers: TierConfig[]): PointsDTO {
  const sorted = [...tiers].sort((a, b) => a.minLoanCount - b.minLoanCount);
  let currentIdx = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (profile.loanCycleCount >= sorted[i].minLoanCount) currentIdx = i;
  }
  const current = sorted[currentIdx];
  const next = sorted[currentIdx + 1] ?? null;
  const loansToNextTier = next ? Math.max(next.minLoanCount - profile.loanCycleCount, 0) : null;

  return {
    points: profile.points,
    tier: current.name,
    tierName: current.name.charAt(0) + current.name.slice(1).toLowerCase(),
    nextTierName: next ? next.name.charAt(0) + next.name.slice(1).toLowerCase() : null,
    loanCycleCount: profile.loanCycleCount,
    loansToNextTier,
  };
}

export function toStoreItemDTO(item: RewardItem): StoreItemDTO {
  return {
    id: item.id,
    title: item.title,
    points: item.points,
    imageUrl: item.imageUrl,
  };
}

export type AdminStoreItemDTO = {
  id: number;
  title: string;
  points: number;
  imageUrl: string | null;
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export function toAdminStoreItemDTO(item: RewardItem): AdminStoreItemDTO {
  return {
    id: item.id,
    title: item.title,
    points: item.points,
    imageUrl: item.imageUrl,
    stock: item.stock,
    isActive: item.isActive,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function toRedemptionDTO(r: RedemptionWithItem): RedemptionDTO {
  return {
    id: r.id,
    title: r.rewardItem.title,
    points: r.points,
    imageUrl: r.rewardItem.imageUrl,
    status: r.status,
    redeemedAt: r.redeemedAt.toISOString(),
  };
}

export type AdminRedemptionDTO = {
  id: number;
  status: string;
  points: number;
  redeemedAt: string;
  customer: { id: number; name: string | null; phone: string | null };
  rewardItem: { id: number; title: string; imageUrl: string | null };
};

export function toAdminRedemptionDTO(r: AdminRedemptionRow): AdminRedemptionDTO {
  return {
    id: r.id,
    status: r.status,
    points: r.points,
    redeemedAt: r.redeemedAt.toISOString(),
    customer: {
      id: r.customer.id,
      name: r.customer.customerProfile?.name ?? null,
      phone: r.customer.customerProfile?.phone ?? null,
    },
    rewardItem: {
      id: r.rewardItem.id,
      title: r.rewardItem.title,
      imageUrl: r.rewardItem.imageUrl,
    },
  };
}
