import { api } from "@/lib/api";
import type { PartnerCode, PartnerChannelOption, PartnerCodePayload, PartnerDetail } from "../types";

export const partnersApi = {
  list: () => api.get<PartnerCode[]>("/admin/partners"),

  listChannels: () => api.get<PartnerChannelOption[]>("/admin/partners/channels"),

  get: (id: number) => api.get<PartnerDetail>(`/admin/partners/${id}`),

  getUsages: (id: number) => api.get<PartnerDetail>(`/admin/partners/${id}/usages`),

  create: (payload: PartnerCodePayload) =>
    api.post<PartnerCode>("/admin/partners", payload),

  update: (id: number, payload: PartnerCodePayload) =>
    api.patch<PartnerCode>(`/admin/partners/${id}`, payload),

  delete: (id: number) => api.delete<void>(`/admin/partners/${id}`),
};
