import { TierConfig } from '@prisma/client';

export function resolveTierName(points: number, tiers: TierConfig[]): string {
  const sorted = [...tiers].sort((a, b) => b.minPoints - a.minPoints);
  for (const t of sorted) {
    if (points >= t.minPoints) return t.name;
  }
  return sorted[sorted.length - 1]?.name ?? 'BRONZE';
}
