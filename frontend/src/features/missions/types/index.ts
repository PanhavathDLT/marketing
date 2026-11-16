export type MissionType = string; // dynamic — fetch from GET /admin/missions/types

export interface MissionTypeOption {
  value: string;
  label: string;
}

export interface Mission {
  id: number;
  campaignId: number;
  type: MissionType;
  title: string;
  points: number;
  requiredCount: number;
  startDate: string;
  endDate: string;
  iconUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MissionPayload {
  type: MissionType;
  title: string;
  points: number;
  requiredCount: number;
  startDate: string;
  endDate: string;
  iconUrl?: string;
}
