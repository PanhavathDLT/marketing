import { Request, Response, NextFunction } from 'express';
import { success } from '../../shared/utils/response.js';
import { RewardStoreService } from './reward-store.service.js';

export class RewardStoreController {
  constructor(private readonly service: RewardStoreService) {}

  list = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.service.list());
    } catch (err) { next(err); }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.service.getById(Number(req.params.id)));
    } catch (err) { next(err); }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.service.create(req.body), 201);
    } catch (err) { next(err); }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.service.update(Number(req.params.id), req.body));
    } catch (err) { next(err); }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.delete(Number(req.params.id));
      success(res, null);
    } catch (err) { next(err); }
  };

  // ─── Redemptions ───────────────────────────────────────────────────────────

  listRedemptions = async (_req: Request, res: Response, next: NextFunction) => {
    try { success(res, await this.service.listRedemptions()); } catch (err) { next(err); }
  };

  updateRedemptionStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.service.updateRedemptionStatus(Number(req.params.id), req.body.status));
    } catch (err) { next(err); }
  };
}
