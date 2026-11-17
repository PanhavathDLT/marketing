import { api } from "@/lib/api";
import type { Referral } from "../types";

export const referralApi = {
  list: () => api.get<Referral[]>("/admin/analytics/referrals"),
};
