import { Mission } from '@prisma/client';
import { CampaignWithMissions } from './campaign.repository.js';

export type CampaignStatus = 'DRAFT' | 'UPCOMING' | 'ACTIVE' | 'COMPLETED';

export type MissionSummaryDTO = {
  id: number;
  type: string;
  title: string;
  points: number;
  requiredCount: number;
  startDate: string;
  endDate: string;
  iconUrl: string | null;
};

export type CampaignDTO = {
  id: number;
  title: string;
  description: string | null;
  status: CampaignStatus;
  missions: MissionSummaryDTO[];
  createdAt: string;
  updatedAt: string;
};

/**
 * Derive campaign status from its missions' date ranges.
 *
 * DRAFT     – no missions yet
 * UPCOMING  – all missions start in the future
 * ACTIVE    – at least one mission is currently within its date window
 * COMPLETED – all missions have ended
 */
export function computeCampaignStatus(missions: Mission[]): CampaignStatus {
  if (missions.length === 0) return 'DRAFT';
  const now = new Date();
  const hasActive = missions.some(m => m.startDate <= now && m.endDate >= now);
  if (hasActive) return 'ACTIVE';
  const allCompleted = missions.every(m => m.endDate < now);
  if (allCompleted) return 'COMPLETED';
  return 'UPCOMING';
}

export function toCampaignDTO(campaign: CampaignWithMissions): CampaignDTO {
  return {
    id: campaign.id,
    title: campaign.title,
    description: campaign.description,
    status: computeCampaignStatus(campaign.missions),
    missions: campaign.missions.map((m) => ({
      id: m.id,
      type: m.type,
      title: m.title,
      points: m.points,
      requiredCount: m.requiredCount,
      startDate: m.startDate.toISOString(),
      endDate: m.endDate.toISOString(),
      iconUrl: m.iconUrl,
    })),
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}
