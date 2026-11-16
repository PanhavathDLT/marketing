import {
  User,
  CustomerProfile,
  StaffProfile,
  StaffRole,
  StaffRolePermission,
  Permission,
} from '@prisma/client';

export type StaffProfileWithRole = StaffProfile & {
  staffRole:
    | (StaffRole & {
        permissions: (StaffRolePermission & { permission: Permission })[];
      })
    | null;
};

export type AuthenticatedUser = User & {
  customerProfile: CustomerProfile | null;
  staffProfile: StaffProfileWithRole | null;
};

declare global {
  namespace Express {
    interface User extends AuthenticatedUser {}
  }
}
