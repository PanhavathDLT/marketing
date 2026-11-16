import { PrismaClient, TierConfig } from '@prisma/client';
import { CreateTierInput, UpdateTierInput } from './tier.schema.js';

export class TierRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findAll(): Promise<TierConfig[]> {
    return this.prisma.tierConfig.findMany({ orderBy: { minPoints: 'asc' } });
  }

  findById(id: number): Promise<TierConfig | null> {
    return this.prisma.tierConfig.findUnique({ where: { id } });
  }

  findByName(name: string): Promise<TierConfig | null> {
    return this.prisma.tierConfig.findUnique({ where: { name } });
  }

  create(data: CreateTierInput): Promise<TierConfig> {
    return this.prisma.tierConfig.create({ data });
  }

  update(id: number, data: UpdateTierInput): Promise<TierConfig> {
    return this.prisma.tierConfig.update({ where: { id }, data });
  }

  async renameUsersOnTier(oldName: string, newName: string): Promise<void> {
    await this.prisma.customerProfile.updateMany({ where: { tier: oldName }, data: { tier: newName } });
  }

  delete(id: number): Promise<TierConfig> {
    return this.prisma.tierConfig.delete({ where: { id } });
  }

  countUsersOnTier(name: string): Promise<number> {
    return this.prisma.customerProfile.count({ where: { tier: name } });
  }
}
