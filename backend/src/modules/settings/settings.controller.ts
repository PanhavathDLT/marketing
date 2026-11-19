import { Request, Response, NextFunction } from 'express';
import { success } from '../../shared/utils/response.js';
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
      const { refereeBonus, referrerBonus } = req.body as { refereeBonus: number; referrerBonus: number };
      success(res, await this.service.updateReferralConfig(Number(refereeBonus), Number(referrerBonus)));
    } catch (err) { next(err); }
  };

  getCheckInConfig = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.service.getCheckInConfig());
    } catch (err) { next(err); }
  };

  updateCheckInConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.service.updateCheckInConfig(req.body.points));
    } catch (err) { next(err); }
  };
}
