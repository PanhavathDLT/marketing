import { api } from "@/lib/api";
import type { AdminUser, AdminUserPayload, PermissionGroup, RolePayload, StaffRole } from "../types";

const BASE = "/admin/user-management";

export const userManagementApi = {
  // Users
  listUsers: () => api.get<AdminUser[]>(`${BASE}/users`),
  createUser: (payload: AdminUserPayload) => api.post<AdminUser>(`${BASE}/users`, payload),
  updateUser: (id: number, payload: Partial<AdminUserPayload>) =>
    api.patch<AdminUser>(`${BASE}/users/${id}`, payload),
  deleteUser: (id: number) => api.delete<void>(`${BASE}/users/${id}`),

  // Roles
  listRoles: () => api.get<StaffRole[]>(`${BASE}/roles`),
  createRole: (payload: RolePayload) => api.post<StaffRole>(`${BASE}/roles`, payload),
  updateRole: (id: number, payload: Partial<RolePayload>) =>
    api.patch<StaffRole>(`${BASE}/roles/${id}`, payload),
  deleteRole: (id: number) => api.delete<void>(`${BASE}/roles/${id}`),
  setRolePermissions: (id: number, permissionIds: number[]) =>
    api.put<StaffRole>(`${BASE}/roles/${id}/permissions`, { permissionIds }),

  // Permissions
  listPermissions: () => api.get<PermissionGroup[]>(`${BASE}/permissions`),
};
