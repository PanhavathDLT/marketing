import { TierConfig } from '@prisma/client';

export type TierDTO = {
  id: number;
  name: string;
  rewardPoints: number;
  minLoanCount: number;
  iconUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toTierDTO(tier: TierConfig): TierDTO {
  return {
    id: tier.id,
    name: tier.name,
    rewardPoints: tier.rewardPoints,
    minLoanCount: tier.minLoanCount,
    iconUrl: tier.iconUrl,
    createdAt: tier.createdAt.toISOString(),
    updatedAt: tier.updatedAt.toISOString(),
  };
}
