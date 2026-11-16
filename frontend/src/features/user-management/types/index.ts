export interface Permission {
  id: number;
  action: string;
}

export interface PermissionGroup {
  module: string;
  permissions: Permission[];
}

export interface StaffRole {
  id: number;
  name: string;
  description?: string;
  userCount: number;
  permissions: (Permission & { module: string })[];
  createdAt: string;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  staffRoleId: number | null;
  staffRoleName: string | null;
  createdAt: string;
}

export interface AdminUserPayload {
  name: string;
  email: string;
  password?: string;
  staffRoleId?: number | null;
}

export interface RolePayload {
  name: string;
  description?: string;
}
