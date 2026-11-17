import { Request, Response, NextFunction } from 'express';
import { success } from '@shared/utils/response.js';
import { SettingsService } from './settings.service.js';

export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  getReferralConfig = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.service.getReferralConfig());
    } catch (err) { next(err); }
  };

  updateReferralConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refereeBonus } = req.body as { refereeBonus: number };
      success(res, await this.service.updateReferralConfig(Number(refereeBonus)));
    } catch (err) { next(err); }
  };
}
