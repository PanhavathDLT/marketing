import { api } from "@/lib/api";
import type { Tier, TierPayload } from "../types";

export const tiersApi = {
  list: () => api.get<Tier[]>("/admin/tiers"),
  get: (id: number) => api.get<Tier>(`/admin/tiers/${id}`),
  create: (payload: TierPayload) => api.post<Tier>("/admin/tiers", payload),
  update: (id: number, payload: Partial<TierPayload>) =>
    api.patch<Tier>(`/admin/tiers/${id}`, payload),
  delete: (id: number) => api.delete<void>(`/admin/tiers/${id}`),
};
