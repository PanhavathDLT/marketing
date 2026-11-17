import { PrismaClient, ReferralConfig } from '@prisma/client';

export class SettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  getReferralConfig(): Promise<ReferralConfig | null> {
    return this.prisma.referralConfig.findFirst();
  }

  upsertReferralConfig(refereeBonus: number): Promise<ReferralConfig> {
    // Single-row table: always upsert id=1
    return this.prisma.referralConfig.upsert({
      where: { id: 1 },
      update: { refereeBonus },
      create: { refereeBonus },
    });
  }
}
