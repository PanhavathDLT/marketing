import { PrismaClient, User, StaffProfile, StaffRole, StaffRolePermission, Permission, CustomerProfile } from '@prisma/client';

export type StaffProfileWithRole = StaffProfile & {
  staffRole: StaffRole | null;
};

export type UserWithStaffProfile = User & {
  staffProfile: StaffProfileWithRole | null;
};

export class UserManagementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ─── Users ─────────────────────────────────────────────────────────────────

  findAllAdminUsers(): Promise<UserWithStaffProfile[]> {
    return this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      include: { staffProfile: { include: { staffRole: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  findAdminUserById(id: number): Promise<UserWithStaffProfile | null> {
    return this.prisma.user.findFirst({
      where: { id, role: 'ADMIN' },
      include: { staffProfile: { include: { staffRole: true } } },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    const profile = await this.prisma.staffProfile.findUnique({
      where: { email },
      include: { user: true },
    });
    return profile?.user ?? null;
  }

  async createAdminUser(data: {
    name: string;
    email: string;
    password: string;
    staffRoleId?: number;
  }): Promise<UserWithStaffProfile> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { role: 'ADMIN' } });
      await tx.staffProfile.create({
        data: {
          userId: user.id,
          email: data.email,
          password: data.password,
          name: data.name,
          staffRoleId: data.staffRoleId,
        },
      });
      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: { staffProfile: { include: { staffRole: true } } },
      });
    });
  }

  async updateAdminUser(
    id: number,
    data: Partial<{ name: string; email: string; password: string; staffRoleId: number | null }>,
  ): Promise<UserWithStaffProfile> {
    await this.prisma.staffProfile.update({
      where: { userId: id },
      data,
    });
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: { staffProfile: { include: { staffRole: true } } },
    });
  }

  deleteAdminUser(id: number): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }

  // ─── Roles ─────────────────────────────────────────────────────────────────

  findAllRoles() {
    return this.prisma.staffRole.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  findRoleById(id: number) {
    return this.prisma.staffRole.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
  }

  findRoleByName(name: string): Promise<StaffRole | null> {
    return this.prisma.staffRole.findUnique({ where: { name } });
  }

  createRole(data: { name: string; description?: string }): Promise<StaffRole> {
    return this.prisma.staffRole.create({ data });
  }

  updateRole(id: number, data: Partial<{ name: string; description: string }>): Promise<StaffRole> {
    return this.prisma.staffRole.update({ where: { id }, data });
  }

  deleteRole(id: number): Promise<StaffRole> {
    return this.prisma.staffRole.delete({ where: { id } });
  }

  countUsersWithRole(roleId: number): Promise<number> {
    return this.prisma.staffProfile.count({ where: { staffRoleId: roleId } });
  }

  async setRolePermissions(roleId: number, permissionIds: number[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.staffRolePermission.deleteMany({ where: { staffRoleId: roleId } }),
      this.prisma.staffRolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ staffRoleId: roleId, permissionId })),
        skipDuplicates: true,
      }),
    ]);
  }

  // ─── Customers ─────────────────────────────────────────────────────────────

  findAllCustomers() {
    return this.prisma.customerProfile.findMany({
      include: { referredBy: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findCustomerById(id: number) {
    return this.prisma.customerProfile.findUnique({
      where: { id },
      include: { referredBy: true },
    });
  }

  // ─── Permissions ───────────────────────────────────────────────────────────

  findAllPermissions(): Promise<Permission[]> {
    return this.prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { action: 'asc' }] });
  }

  findPermissionsByIds(ids: number[]): Promise<Permission[]> {
    return this.prisma.permission.findMany({ where: { id: { in: ids } } });
  }
}
