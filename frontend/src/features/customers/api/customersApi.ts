import { api } from "@/lib/api";
import type { Customer } from "../types";

export const customersApi = {
  list: () => api.get<Customer[]>("/admin/user-management/customers"),
  get: (id: number) => api.get<Customer>(`/admin/user-management/customers/${id}`),
};
