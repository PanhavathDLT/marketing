import { TierConfig } from '@prisma/client';

export function resolveTierByLoanCount(loanCount: number, tiers: TierConfig[]): string {
  const sorted = [...tiers].sort((a, b) => b.minLoanCount - a.minLoanCount);
  for (const t of sorted) {
    if (loanCount >= t.minLoanCount) return t.name;
  }
  return sorted[sorted.length - 1]?.name ?? 'BRONZE';
}
