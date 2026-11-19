import { api } from "@/lib/api";

export interface CheckInConfig {
  points: number[];
}

export interface CheckInCustomer {
  customerId: number;
  name: string | null;
  phone: string;
  tier: string;
  points: number;
  currentStreakDay: number;
  lastCheckInDate: string;
  totalCheckIns: number;
}

export const streakApi = {
  getConfig: () => api.get<CheckInConfig>("/admin/settings/check-in"),
  updateConfig: (payload: CheckInConfig) =>
    api.patch<CheckInConfig>("/admin/settings/check-in", payload),
  listCustomers: () =>
    api.get<CheckInCustomer[]>("/admin/analytics/check-ins/customers"),
};
