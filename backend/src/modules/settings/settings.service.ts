import { AppError } from '@shared/errors/AppError.js';
import { SettingsRepository } from './settings.repository.js';

export class SettingsService {
  constructor(private readonly repo: SettingsRepository) {}

  async getReferralConfig() {
    const config = await this.repo.getReferralConfig();
    if (!config) throw new AppError('Referral config not found', 404);
    return { refereeBonus: config.refereeBonus };
  }

  async updateReferralConfig(refereeBonus: number) {
    if (refereeBonus < 0) throw new AppError('refereeBonus must be >= 0', 422);
    const config = await this.repo.upsertReferralConfig(refereeBonus);
    return { refereeBonus: config.refereeBonus };
  }
}
