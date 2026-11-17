import { api } from "@/lib/api";

export interface ReferralSettings {
  refereeBonus: number;
}

export const settingsApi = {
  getReferral: () => api.get<ReferralSettings>("/admin/settings/referral"),
  updateReferral: (payload: ReferralSettings) =>
    api.patch<ReferralSettings>("/admin/settings/referral", payload),
};
