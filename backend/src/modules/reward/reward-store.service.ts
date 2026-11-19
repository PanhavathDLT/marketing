import { RedemptionStatus } from '@prisma/client';
import { AppError } from '../../shared/errors/AppError.js';
import { RewardRepository } from './reward.repository.js';
import {
  toAdminStoreItemDTO, AdminStoreItemDTO,
  toAdminRedemptionDTO, AdminRedemptionDTO,
} from './reward.mapper.js';
import { CreateRewardItemInput, UpdateRewardItemInput } from './reward-store.schema.js';

export class RewardStoreService {
  constructor(private readonly repo: RewardRepository) {}

  async list(): Promise<AdminStoreItemDTO[]> {
    return (await this.repo.findAllItems()).map(toAdminStoreItemDTO);
  }

  async getById(id: number): Promise<AdminStoreItemDTO> {
    const item = await this.repo.findItemById(id);
    if (!item) throw new AppError('Reward item not found', 404);
    return toAdminStoreItemDTO(item);
  }

  async create(input: CreateRewardItemInput): Promise<AdminStoreItemDTO> {
    return toAdminStoreItemDTO(await this.repo.createItem(input));
  }

  async update(id: number, input: UpdateRewardItemInput): Promise<AdminStoreItemDTO> {
    await this.getById(id); // 404 guard
    return toAdminStoreItemDTO(await this.repo.updateItem(id, input));
  }

  async delete(id: number): Promise<void> {
    await this.getById(id); // 404 guard
    await this.repo.deleteItem(id);
  }

  // ─── Redemptions ───────────────────────────────────────────────────────────

  async listRedemptions(): Promise<AdminRedemptionDTO[]> {
    return (await this.repo.findAllRedemptions()).map(toAdminRedemptionDTO);
  }

  async updateRedemptionStatus(id: number, status: RedemptionStatus): Promise<AdminRedemptionDTO> {
    const rows = await this.repo.findAllRedemptions();
    const row = rows.find((r) => r.id === id);
    if (!row) throw new AppError('Redemption not found', 404);
    await this.repo.updateRedemptionStatus(id, status);
    return toAdminRedemptionDTO({ ...row, status });
  }
}
