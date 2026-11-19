import {
  PrismaClient,
  User,
  CustomerProfile,
  RewardItem,
  Redemption,
  PointsHistory,
  RedemptionStatus,
} from '@prisma/client';

export type UserWithCustomerProfile = User & { customerProfile: CustomerProfile | null };
export type RedemptionWithItem = Redemption & { rewardItem: RewardItem };
export type AdminRedemptionRow = Redemption & {
  rewardItem: RewardItem;
  customer: { id: number; customerProfile: { name: string | null; phone: string | null } | null };
};

export class RewardRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findUser(id: number): Promise<UserWithCustomerProfile | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { customerProfile: true },
    });
  }

  async findUserByReferralCode(
    code: string,
  ): Promise<(CustomerProfile & { user: User }) | null> {
    return this.prisma.customerProfile.findUnique({
      where: { referralCode: code },
      include: { user: true },
    });
  }

  updateUserReferredBy(customerId: number, referrerProfileId: number): Promise<CustomerProfile> {
    return this.prisma.customerProfile.update({
      where: { userId: customerId },
      data: { referredById: referrerProfileId },
    });
  }

  async applyReferralCodeWithBonus(
    customerId: number,       // referee's User.id
    referrerProfileId: number, // referrer's CustomerProfile.id
    referrerUserId: number,   // referrer's User.id
    refereeBonus: number,
    referrerBonus: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Link referee and award referee bonus
      await tx.customerProfile.update({
        where: { userId: customerId },
        data: {
          referredById: referrerProfileId,
          ...(refereeBonus > 0 && { points: { increment: refereeBonus } }),
        },
      });
      if (refereeBonus > 0) {
        await tx.pointsHistory.create({
          data: {
            customerId,
            source: 'REFERRAL',
            title: 'Referral joining bonus',
            points: refereeBonus,
          },
        });
      }

      // Award referrer auto bonus (only when no active REFERRAL mission)
      if (referrerBonus > 0) {
        await tx.customerProfile.update({
          where: { id: referrerProfileId },
          data: { points: { increment: referrerBonus } },
        });
        await tx.pointsHistory.create({
          data: {
            customerId: referrerUserId,
            source: 'REFERRAL',
            title: 'Referral bonus',
            points: referrerBonus,
          },
        });
      }
    });
  }

  getPointsHistory(customerId: number): Promise<PointsHistory[]> {
    return this.prisma.pointsHistory.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findActiveStoreItems(): Promise<RewardItem[]> {
    return this.prisma.rewardItem.findMany({
      where: { isActive: true, stock: { gt: 0 } },
      orderBy: { createdAt: 'asc' },
    });
  }

  findRewardItem(id: number): Promise<RewardItem | null> {
    return this.prisma.rewardItem.findUnique({ where: { id } });
  }

  findRedemptionByIdempotencyKey(key: string): Promise<Redemption | null> {
    return this.prisma.redemption.findUnique({ where: { idempotencyKey: key } });
  }

  findRedemptionsByCustomer(customerId: number): Promise<RedemptionWithItem[]> {
    return this.prisma.redemption.findMany({
      where: { customerId },
      include: { rewardItem: true },
      orderBy: { redeemedAt: 'desc' },
    });
  }

  async performCheckIn(
    customerId: number,
    checkInDate: Date,
    day: number,
    pts: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.checkIn.create({
        data: { customerId, checkInDate, day, points: pts },
      });
      await tx.customerProfile.update({
        where: { userId: customerId },
        data: {
          lastCheckInDate: checkInDate,
          currentStreakDay: day,
          points: { increment: pts },
        },
      });
      await tx.pointsHistory.create({
        data: { customerId, source: 'CHECK_IN', title: 'Daily check-in', points: pts },
      });
    });
  }

  async updateLoanCycle(
    customerId: number,
    loanCount: number,
    newTier: string,
    bonusPoints: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.customerProfile.update({
        where: { userId: customerId },
        data: {
          loanCycleCount: loanCount,
          tier: newTier,
          ...(bonusPoints > 0 && { points: { increment: bonusPoints } }),
        },
      });
      if (bonusPoints > 0) {
        await tx.pointsHistory.create({
          data: {
            customerId,
            source: 'MISSION',
            title: `Tier-up bonus — ${newTier}`,
            points: bonusPoints,
          },
        });
      }
    });
  }

  // ─── Admin reward store ───────────────────────────────────────────────────

  findAllItems(): Promise<RewardItem[]> {
    return this.prisma.rewardItem.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findItemById(id: number): Promise<RewardItem | null> {
    return this.prisma.rewardItem.findUnique({ where: { id } });
  }

  createItem(data: {
    title: string;
    points: number;
    imageUrl?: string;
    stock: number;
    isActive?: boolean;
  }): Promise<RewardItem> {
    return this.prisma.rewardItem.create({ data });
  }

  updateItem(
    id: number,
    data: Partial<{ title: string; points: number; imageUrl: string | null; stock: number; isActive: boolean }>,
  ): Promise<RewardItem> {
    return this.prisma.rewardItem.update({ where: { id }, data });
  }

  deleteItem(id: number): Promise<RewardItem> {
    return this.prisma.rewardItem.delete({ where: { id } });
  }

  // ─── Admin redemptions ────────────────────────────────────────────────────

  findAllRedemptions(): Promise<AdminRedemptionRow[]> {
    return this.prisma.redemption.findMany({
      include: {
        rewardItem: true,
        customer: {
          select: {
            id: true,
            customerProfile: { select: { name: true, phone: true } },
          },
        },
      },
      orderBy: { redeemedAt: 'desc' },
    }) as Promise<AdminRedemptionRow[]>;
  }

  updateRedemptionStatus(id: number, status: RedemptionStatus): Promise<Redemption> {
    return this.prisma.redemption.update({ where: { id }, data: { status } });
  }

  async performRedeem(
    customerId: number,
    rewardItem: RewardItem,
    idempotencyKey?: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.rewardItem.update({
        where: { id: rewardItem.id },
        data: { stock: { decrement: 1 } },
      }),
      this.prisma.customerProfile.update({
        where: { userId: customerId },
        data: { points: { decrement: rewardItem.points } },
      }),
      this.prisma.redemption.create({
        data: {
          customerId,
          rewardItemId: rewardItem.id,
          points: rewardItem.points,
          idempotencyKey,
        },
      }),
      this.prisma.pointsHistory.create({
        data: {
          customerId,
          source: 'REDEEM',
          title: rewardItem.title,
          points: -rewardItem.points,
        },
      }),
    ]);
  }

  updateUserTier(userId: number, tier: string): Promise<void> {
    return this.prisma.customerProfile
      .update({ where: { userId }, data: { tier } })
      .then(() => void 0);
  }
}
