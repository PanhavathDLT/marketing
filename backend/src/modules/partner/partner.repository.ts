import { PrismaClient, PartnerCode, PartnerCodeUsage, PartnerConversion, PartnerChannel } from '@prisma/client';

export type PartnerCodeWithStats = PartnerCode & {
  totalUsages: number;
  totalConversions: number;
};

export type UsageWithCustomer = PartnerCodeUsage & {
  customer: { name: string | null; phone: string | null };
};

export class PartnerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(filter?: { isActive?: boolean }): Promise<PartnerCodeWithStats[]> {
    const rows = await this.prisma.partnerCode.findMany({
      where: filter?.isActive !== undefined ? { isActive: filter.isActive } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { usages: true } },
      },
    });

    // Distinct customer conversions per partner code
    const conversionGroups = await this.prisma.partnerConversion.groupBy({
      by: ['partnerCodeId', 'customerId'],
    });
    const convMap = new Map<number, Set<number>>();
    for (const { partnerCodeId, customerId } of conversionGroups) {
      if (!convMap.has(partnerCodeId)) convMap.set(partnerCodeId, new Set());
      convMap.get(partnerCodeId)!.add(customerId);
    }

    return rows.map((r) => ({
      ...r,
      totalUsages: r._count.usages,
      totalConversions: convMap.get(r.id)?.size ?? 0,
    }));
  }

  findById(id: number): Promise<PartnerCode | null> {
    return this.prisma.partnerCode.findUnique({ where: { id } });
  }

  findByCode(code: string): Promise<PartnerCode | null> {
    return this.prisma.partnerCode.findFirst({ where: { code, isActive: true } });
  }

  codeExists(code: string): Promise<boolean> {
    return this.prisma.partnerCode
      .findUnique({ where: { code } })
      .then((r) => r !== null);
  }

  create(data: {
    name: string;
    phone?: string;
    channel?: PartnerChannel;
    note?: string;
    code: string;
  }): Promise<PartnerCode> {
    return this.prisma.partnerCode.create({ data });
  }

  update(
    id: number,
    data: Partial<{ name: string; phone: string | null; channel: PartnerChannel | null; note: string | null }>,
  ): Promise<PartnerCode> {
    return this.prisma.partnerCode.update({ where: { id }, data });
  }

  deactivate(id: number): Promise<PartnerCode> {
    return this.prisma.partnerCode.update({ where: { id }, data: { isActive: false } });
  }

  async findUsagesWithConversions(partnerCodeId: number) {
    const usages = await this.prisma.partnerCodeUsage.findMany({
      where: { partnerCodeId },
      include: {
        customer: { select: { name: true, phone: true } },
      },
      orderBy: { appliedAt: 'desc' },
    });

    const conversions = await this.prisma.partnerConversion.findMany({
      where: { partnerCodeId },
    });

    const convByCustomer = new Map<number, string[]>();
    for (const c of conversions) {
      if (!convByCustomer.has(c.customerId)) convByCustomer.set(c.customerId, []);
      convByCustomer.get(c.customerId)!.push(c.eventType);
    }

    return usages.map((u) => ({
      customerId: u.customerId,
      customerName: u.customer.name,
      phone: u.customer.phone,
      appliedAt: u.appliedAt,
      conversions: convByCustomer.get(u.customerId) ?? [],
    }));
  }

  // ─── Usage / conversion ────────────────────────────────────────────────────

  findUsageByCustomerId(customerId: number): Promise<PartnerCodeUsage | null> {
    return this.prisma.partnerCodeUsage.findUnique({ where: { customerId } });
  }

  createUsage(partnerCodeId: number, customerId: number): Promise<PartnerCodeUsage> {
    return this.prisma.partnerCodeUsage.create({ data: { partnerCodeId, customerId } });
  }

  async createConversion(
    partnerCodeId: number,
    customerId: number,
    eventType: string,
  ): Promise<PartnerConversion | null> {
    // One row per (partnerCodeId, customerId, eventType) — idempotent
    const existing = await this.prisma.partnerConversion.findFirst({
      where: { partnerCodeId, customerId, eventType },
    });
    if (existing) return null;
    return this.prisma.partnerConversion.create({
      data: { partnerCodeId, customerId, eventType },
    });
  }
}
