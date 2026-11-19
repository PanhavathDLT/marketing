import { AppError } from '../../shared/errors/AppError.js';
import { TierRepository } from './tier.repository.js';
import { toTierDTO, TierDTO } from './tier.mapper.js';
import { CreateTierInput, UpdateTierInput } from './tier.schema.js';

export class TierService {
  constructor(private readonly repo: TierRepository) {}

  async list(): Promise<TierDTO[]> {
    return (await this.repo.findAll()).map(toTierDTO);
  }

  async getById(id: number): Promise<TierDTO> {
    const tier = await this.repo.findById(id);
    if (!tier) throw new AppError('Tier not found', 404);
    return toTierDTO(tier);
  }

  async create(input: CreateTierInput): Promise<TierDTO> {
    const existing = await this.repo.findByName(input.name);
    if (existing) throw new AppError(`Tier "${input.name}" already exists`, 409);
    return toTierDTO(await this.repo.create(input));
  }

  async update(id: number, input: UpdateTierInput): Promise<TierDTO> {
    const tier = await this.repo.findById(id);
    if (!tier) throw new AppError('Tier not found', 404);
    if (input.name && input.name !== tier.name) {
      const existing = await this.repo.findByName(input.name);
      if (existing) throw new AppError(`Tier "${input.name}" already exists`, 409);
      // Cascade rename on user records
      await this.repo.renameUsersOnTier(tier.name, input.name);
    }
    return toTierDTO(await this.repo.update(id, input));
  }

  async delete(id: number): Promise<void> {
    const tier = await this.repo.findById(id);
    if (!tier) throw new AppError('Tier not found', 404);
    const userCount = await this.repo.countUsersOnTier(tier.name);
    if (userCount > 0)
      throw new AppError(`Cannot delete tier "${tier.name}" — ${userCount} customer(s) are assigned to it.`, 409);
    await this.repo.delete(id);
  }
}
