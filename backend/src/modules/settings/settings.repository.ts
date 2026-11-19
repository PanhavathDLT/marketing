import { PrismaClient, ReferralConfig, CheckInConfig } from '@prisma/client';

export type CheckInPoints = [number, number, number, number, number, number, number];

export class SettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  getReferralConfig(): Promise<ReferralConfig | null> {
    return this.prisma.referralConfig.findFirst();
  }

  upsertReferralConfig(refereeBonus: number, referrerBonus: number): Promise<ReferralConfig> {
    return this.prisma.referralConfig.upsert({
      where: { id: 1 },
      update: { refereeBonus, referrerBonus },
      create: { refereeBonus, referrerBonus },
    });
  }

  getCheckInConfig(): Promise<CheckInConfig | null> {
    return this.prisma.checkInConfig.findFirst();
  }

  upsertCheckInConfig(points: CheckInPoints): Promise<CheckInConfig> {
    const [day1, day2, day3, day4, day5, day6, day7] = points;
    return this.prisma.checkInConfig.upsert({
      where: { id: 1 },
      update: { day1, day2, day3, day4, day5, day6, day7 },
      create: { day1, day2, day3, day4, day5, day6, day7 },
    });
  }
}
