import { PrismaClient } from '@prisma/client';

export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getOverviewStats() {
    const [totalCustomers, totalCampaigns, totalRedemptions, totalPointsIssued] = await Promise.all([
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.campaign.count(),
      this.prisma.redemption.count(),
      this.prisma.pointsHistory.aggregate({
        _sum: { points: true },
        where: { points: { gt: 0 } },
      }),
    ]);
    return { totalCustomers, totalCampaigns, totalRedemptions, totalPointsIssued };
  }

  getCampaignWithMissions(campaignId: number) {
    return this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { missions: true },
    });
  }

  async getCampaignMissionStats(missionIds: number[]) {
    return Promise.all([
      this.prisma.customerMission.groupBy({
        by: ['customerId'],
        where: { missionId: { in: missionIds } },
      }),
      this.prisma.customerMission.count({
        where: { missionId: { in: missionIds }, status: 'CLAIMED' },
      }),
    ]);
  }

  async getCheckInCounts(since: Date): Promise<[number, number]> {
    return Promise.all([
      this.prisma.checkIn.count({ where: { createdAt: { gte: since } } }),
      this.prisma.checkIn.count(),
    ]);
  }

  async getReferrals() {
    return this.prisma.customerProfile.findMany({
      where: { referredById: { not: null } },
      include: {
        referredBy: true,   // referrer's CustomerProfile
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCheckInCustomers() {
    // Customers who have at least one check-in
    return this.prisma.customerProfile.findMany({
      where: { lastCheckInDate: { not: null } },
      include: {
        user: {
          select: {
            checkIns: {
              select: { id: true },
            },
          },
        },
      },
      orderBy: { lastCheckInDate: 'desc' },
    });
  }
}
