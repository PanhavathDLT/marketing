import type { Mission } from "@/features/missions/types";

export type CampaignStatus = "DRAFT" | "UPCOMING" | "ACTIVE" | "COMPLETED";

export interface Campaign {
  id: number;
  title: string;
  description: string;
  status: CampaignStatus;
  missions: Mission[];
  createdAt: string;
  updatedAt: string;
}

export interface CampaignPayload {
  title: string;
  description: string;
}
