import { Request, Response, NextFunction } from 'express';
import { success } from '@shared/utils/response.js';
import { AnalyticsService } from './analytics.service.js';

export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  getOverview = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.service.getOverview());
    } catch (err) { next(err); }
  };

  getCampaignStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.service.getCampaignStats(Number(req.params.campaignId)));
    } catch (err) { next(err); }
  };

  getCheckInStats = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.service.getCheckInStats());
    } catch (err) { next(err); }
  };

  getReferrals = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.service.getReferrals());
    } catch (err) { next(err); }
  };
}
