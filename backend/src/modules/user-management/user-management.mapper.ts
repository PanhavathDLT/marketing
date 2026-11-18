import { User, StaffProfile, StaffRole, Permission, StaffRolePermission, CustomerProfile } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PermissionDTO = {
  id: number;
  module: string;
  action: string;
};

export type PermissionGroupDTO = {
  module: string;
  permissions: { id: number; action: string }[];
};

export type RoleDTO = {
  id: number;
  name: string;
  description: string | null;
  permissions: PermissionDTO[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserDTO = {
  id: number;
  name: string | null;
  email: string | null;
  staffRoleId: number | null;
  staffRoleName: string | null;
  isSuperAdmin: boolean;
  createdAt: string;
};

// ─── Mappers ──────────────────────────────────────────────────────────────────

export function toPermissionDTO(p: Permission): PermissionDTO {
  return { id: p.id, module: p.module, action: p.action };
}

export function groupPermissions(permissions: Permission[]): PermissionGroupDTO[] {
  const map = new Map<string, { id: number; action: string }[]>();
  for (const p of permissions) {
    const list = map.get(p.module) ?? [];
    list.push({ id: p.id, action: p.action });
    map.set(p.module, list);
  }
  return Array.from(map.entries()).map(([module, perms]) => ({ module, permissions: perms }));
}

type RoleWithPermissions = StaffRole & {
  permissions: (StaffRolePermission & { permission: Permission })[];
  _count?: { users: number };
};

export function toRoleDTO(role: RoleWithPermissions, userCount = 0): RoleDTO {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions.map((rp) => toPermissionDTO(rp.permission)),
    userCount: role._count?.users ?? userCount,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };
}

type UserWithStaffProfile = User & {
  staffProfile: (StaffProfile & { staffRole: StaffRole | null }) | null;
};

export type CustomerDTO = {
  id: number;
  userId: number;
  name: string | null;
  phone: string | null;
  points: number;
  tier: string;
  loanCycleCount: number;
  referralCode: string;
  referredBy: { id: number; name: string | null; referralCode: string } | null;
  joinedAt: string;
};

type CustomerProfileWithReferrer = CustomerProfile & {
  referredBy: CustomerProfile | null;
};

export function toCustomerDTO(cp: CustomerProfileWithReferrer): CustomerDTO {
  return {
    id: cp.id,
    userId: cp.userId,
    name: cp.name,
    phone: cp.phone,
    points: cp.points,
    tier: cp.tier,
    loanCycleCount: cp.loanCycleCount,
    referralCode: cp.referralCode,
    referredBy: cp.referredBy
      ? { id: cp.referredBy.id, name: cp.referredBy.name, referralCode: cp.referredBy.referralCode }
      : null,
    joinedAt: cp.createdAt.toISOString(),
  };
}

export function toAdminUserDTO(user: UserWithStaffProfile): AdminUserDTO {
  const sp = user.staffProfile;
  return {
    id: user.id,
    name: sp?.name ?? null,
    email: sp?.email ?? null,
    staffRoleId: sp?.staffRoleId ?? null,
    staffRoleName: sp?.staffRole?.name ?? null,
    isSuperAdmin: sp?.staffRoleId === null || sp === null,
    createdAt: user.createdAt.toISOString(),
  };
}
