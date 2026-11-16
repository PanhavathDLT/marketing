import { Mission, CustomerMission, MissionStatus, MissionType } from '@prisma/client';

export type MissionDTO = {
  id: number;
  campaignId: number;
  type: MissionType;
  title: string;
  points: number;
  requiredCount: number;
  startDate: string;
  endDate: string;
  iconUrl: string | null;
};

export type CustomerMissionDTO = {
  id: number;
  type: MissionType;
  title: string;
  points: number;
  requiredCount: number;
  progress: number;
  startDate: string;
  endDate: string;
  iconUrl: string | null;
  status: MissionStatus;
};

export function toMissionDTO(mission: Mission): MissionDTO {
  return {
    id: mission.id,
    campaignId: mission.campaignId,
    type: mission.type,
    title: mission.title,
    points: mission.points,
    requiredCount: mission.requiredCount,
    startDate: mission.startDate.toISOString(),
    endDate: mission.endDate.toISOString(),
    iconUrl: mission.iconUrl,
  };
}

type CustomerMissionProgress = { status: MissionStatus; progress: number };

export function toCustomerMissionDTO(
  mission: Mission,
  progressMap: Map<number, CustomerMissionProgress>,
): CustomerMissionDTO {
  const cm = progressMap.get(mission.id);
  return {
    id: mission.id,
    type: mission.type,
    title: mission.title,
    points: mission.points,
    requiredCount: mission.requiredCount,
    progress: cm?.progress ?? 0,
    startDate: mission.startDate.toISOString(),
    endDate: mission.endDate.toISOString(),
    iconUrl: mission.iconUrl,
    status: cm?.status ?? 'IN_PROGRESS',
  };
}
