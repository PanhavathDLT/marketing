import { AppError } from '@shared/errors/AppError.js';
import { SettingsRepository, CheckInPoints } from './settings.repository.js';

function configToArray(c: { day1: number; day2: number; day3: number; day4: number; day5: number; day6: number; day7: number }) {
  return [c.day1, c.day2, c.day3, c.day4, c.day5, c.day6, c.day7] as CheckInPoints;
}

export class SettingsService {
  constructor(private readonly repo: SettingsRepository) {}

  async getReferralConfig() {
    const config = await this.repo.getReferralConfig();
    if (!config) throw new AppError('Referral config not found', 404);
    return { refereeBonus: config.refereeBonus, referrerBonus: config.referrerBonus };
  }

  async updateReferralConfig(refereeBonus: number, referrerBonus: number) {
    if (refereeBonus < 0) throw new AppError('refereeBonus must be >= 0', 422);
    if (referrerBonus < 0) throw new AppError('referrerBonus must be >= 0', 422);
    const config = await this.repo.upsertReferralConfig(refereeBonus, referrerBonus);
    return { refereeBonus: config.refereeBonus, referrerBonus: config.referrerBonus };
  }

  async getCheckInConfig() {
    const config = await this.repo.getCheckInConfig();
    if (!config) throw new AppError('Check-in config not found', 404);
    return { points: configToArray(config) };
  }

  async updateCheckInConfig(points: CheckInPoints) {
    if (points.some((p) => p < 0)) throw new AppError('All point values must be >= 0', 422);
    const config = await this.repo.upsertCheckInConfig(points);
    return { points: configToArray(config) };
  }
}
