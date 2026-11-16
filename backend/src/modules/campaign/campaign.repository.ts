import { PrismaClient, Campaign, Mission } from '@prisma/client';
import { CreateCampaignInput, UpdateCampaignInput } from './campaign.schema.js';

export type CampaignWithMissions = Campaign & { missions: Mission[] };

export class CampaignRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll(): Promise<CampaignWithMissions[]> {
    return this.prisma.campaign.findMany({
      include: { missions: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Returns campaigns that have at least one mission currently active
   * (startDate <= now <= endDate). Used by the customer-facing app to
   * show which campaigns are live.
   */
  findActive(): Promise<CampaignWithMissions[]> {
    const now = new Date();
    return this.prisma.campaign.findMany({
      where: {
        missions: {
          some: {
            startDate: { lte: now },
            endDate: { gte: now },
          },
        },
      },
      include: { missions: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: number): Promise<CampaignWithMissions | null> {
    return this.prisma.campaign.findUnique({
      where: { id },
      include: { missions: true },
    });
  }

  create(input: CreateCampaignInput): Promise<CampaignWithMissions> {
    return this.prisma.campaign.create({
      data: {
        title: input.title,
        description: input.description,
      },
      include: { missions: true },
    });
  }

  update(id: number, input: UpdateCampaignInput): Promise<CampaignWithMissions> {
    return this.prisma.campaign.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
      },
      include: { missions: true },
    });
  }

  delete(id: number): Promise<Campaign> {
    return this.prisma.campaign.delete({ where: { id } });
  }
}
