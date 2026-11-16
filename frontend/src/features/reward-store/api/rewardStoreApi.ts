import { api } from "@/lib/api";
import type { RewardItem, RewardItemPayload, Redemption, RedemptionStatus } from "../types";

export const rewardStoreApi = {
  list: () => api.get<RewardItem[]>("/admin/reward/store"),
  get: (id: number) => api.get<RewardItem>(`/admin/reward/store/${id}`),
  create: (payload: RewardItemPayload) => api.post<RewardItem>("/admin/reward/store", payload),
  update: (id: number, payload: Partial<RewardItemPayload>) =>
    api.patch<RewardItem>(`/admin/reward/store/${id}`, payload),
  delete: (id: number) => api.delete<void>(`/admin/reward/store/${id}`),

  listRedemptions: () => api.get<Redemption[]>("/admin/reward/store/redemptions"),
  updateRedemptionStatus: (id: number, status: RedemptionStatus) =>
    api.patch<Redemption>(`/admin/reward/store/redemptions/${id}/status`, { status }),
};
