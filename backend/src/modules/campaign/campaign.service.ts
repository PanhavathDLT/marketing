import { AppError } from '@shared/errors/AppError.js';
import { CreateCampaignInput, UpdateCampaignInput } from './campaign.schema.js';
import { CampaignRepository } from './campaign.repository.js';
import { toCampaignDTO, CampaignDTO } from './campaign.mapper.js';

export class CampaignService {
  constructor(private readonly repo: CampaignRepository) {}

  async list(): Promise<CampaignDTO[]> {
    return (await this.repo.findAll()).map(toCampaignDTO);
  }

  async listActive(): Promise<CampaignDTO[]> {
    return (await this.repo.findActive()).map(toCampaignDTO);
  }

  async getById(id: number): Promise<CampaignDTO> {
    const campaign = await this.repo.findById(id);
    if (!campaign) throw new AppError('Campaign not found', 404);
    return toCampaignDTO(campaign);
  }

  async create(input: CreateCampaignInput): Promise<CampaignDTO> {
    return toCampaignDTO(await this.repo.create(input));
  }

  async update(id: number, input: UpdateCampaignInput): Promise<CampaignDTO> {
    await this.getById(id); // 404 guard
    return toCampaignDTO(await this.repo.update(id, input));
  }

  async delete(id: number): Promise<void> {
    await this.getById(id); // 404 guard
    await this.repo.delete(id);
  }
}
