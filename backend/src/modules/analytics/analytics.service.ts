import { AnalyticsRepository } from './analytics.repository.js';

export class AnalyticsService {
  constructor(private readonly repo: AnalyticsRepository) {}

  async getOverview() {
    const stats = await this.repo.getOverviewStats();
    return {
      totalCustomers: stats.totalCustomers,
      totalCampaigns: stats.totalCampaigns,
      totalRedemptions: stats.totalRedemptions,
      totalPointsIssued: stats.totalPointsIssued._sum.points ?? 0,
    };
  }

  async getCampaignStats(campaignId: number) {
    const campaign = await this.repo.getCampaignWithMissions(campaignId);
    if (!campaign) return null;

    const missionIds = campaign.missions.map((m) => m.id);
    const [participants, claimedCount] = await this.repo.getCampaignMissionStats(missionIds);

    return {
      campaign,
      totalParticipants: participants.length,
      totalClaimedMissions: claimedCount,
    };
  }

  async getCheckInStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [totalToday, totalAllTime] = await this.repo.getCheckInCounts(today);
    return { totalToday, totalAllTime };
  }
}
