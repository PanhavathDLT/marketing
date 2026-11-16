import { createHash } from 'node:crypto';
import {
  PrismaClient,
  User,
  CustomerProfile,
  StaffProfile,
  StaffRole,
  StaffRolePermission,
  Permission,
} from '@prisma/client';

// ─── Composite return types ───────────────────────────────────────────────────

export type CustomerWithProfile = User & { customerProfile: CustomerProfile };

export type StaffWithProfile = User & {
  staffProfile: StaffProfile & {
    staffRole:
      | (StaffRole & {
          permissions: (StaffRolePermission & { permission: Permission })[];
        })
      | null;
  };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // ─── Staff ─────────────────────────────────────────────────────────────────

  async findByEmail(email: string): Promise<StaffWithProfile | null> {
    const profile = await this.prisma.staffProfile.findUnique({
      where: { email },
      include: {
        user: true,
        staffRole: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });
    if (!profile) return null;
    const { user, ...rest } = profile;
    return { ...user, staffProfile: rest };
  }

  // ─── Customer ──────────────────────────────────────────────────────────────

  async findByLosUserId(losUserId: number): Promise<CustomerWithProfile | null> {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { losUserId },
      include: { user: true },
    });
    if (!profile) return null;
    const { user, ...rest } = profile;
    return { ...user, customerProfile: rest };
  }

  async findByPhone(phone: string): Promise<CustomerWithProfile | null> {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { phone },
      include: { user: true },
    });
    if (!profile) return null;
    const { user, ...rest } = profile;
    return { ...user, customerProfile: rest };
  }

  async findByReferralCode(code: string): Promise<CustomerWithProfile | null> {
    const profile = await this.prisma.customerProfile.findUnique({
      where: { referralCode: code },
      include: { user: true },
    });
    if (!profile) return null;
    const { user, ...rest } = profile;
    return { ...user, customerProfile: rest };
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  async createAdmin(data: { email: string; password: string; name?: string }): Promise<StaffWithProfile> {
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { role: 'ADMIN' } });
      const profile = await tx.staffProfile.create({
        data: {
          userId: user.id,
          email: data.email,
          password: data.password,
          name: data.name,
        },
        include: {
          user: true,
          staffRole: {
            include: { permissions: { include: { permission: true } } },
          },
        },
      });
      return profile;
    });
    const { user, ...rest } = result;
    return { ...user, staffProfile: rest };
  }

  async createLosCustomer(data: {
    losUserId: number;
    phone: string;
    referralCode: string;
  }): Promise<CustomerWithProfile> {
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { role: 'CUSTOMER' } });
      const profile = await tx.customerProfile.create({
        data: {
          userId: user.id,
          losUserId: data.losUserId,
          phone: data.phone,
          referralCode: data.referralCode,
        },
        include: { user: true },
      });
      return profile;
    });
    const { user, ...rest } = result;
    return { ...user, customerProfile: rest };
  }

  /** Stamp an existing customer account with the LOS user ID (phone-matched on first exchange). */
  async linkLosUserId(userId: number, losUserId: number): Promise<CustomerWithProfile> {
    const profile = await this.prisma.customerProfile.update({
      where: { userId },
      data: { losUserId },
      include: { user: true },
    });
    const { user, ...rest } = profile;
    return { ...user, customerProfile: rest };
  }

  // ─── Refresh tokens ────────────────────────────────────────────────────────

  saveRefreshToken(userId: number, token: string, expiresAt: Date) {
    return this.prisma.refreshToken.create({
      data: { userId, tokenHash: hashToken(token), expiresAt },
    });
  }

  findRefreshToken(token: string) {
    return this.prisma.refreshToken.findFirst({
      where: {
        tokenHash: hashToken(token),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          include: {
            customerProfile: true,
            staffProfile: {
              include: {
                staffRole: { include: { permissions: { include: { permission: true } } } },
              },
            },
          },
        },
      },
    });
  }

  revokeRefreshToken(token: string) {
    return this.prisma.refreshToken.update({
      where: { tokenHash: hashToken(token) },
      data: { revokedAt: new Date() },
    });
  }

  async rotateRefreshToken(oldToken: string, newToken: string, expiresAt: Date) {
    const oldHash = hashToken(oldToken);
    const newHash = hashToken(newToken);
    return this.prisma.$transaction(async (tx) => {
      const old = await tx.refreshToken.update({
        where: { tokenHash: oldHash },
        data: { revokedAt: new Date() },
      });
      await tx.refreshToken.create({
        data: { userId: old.userId, tokenHash: newHash, expiresAt },
      });
    });
  }
}
