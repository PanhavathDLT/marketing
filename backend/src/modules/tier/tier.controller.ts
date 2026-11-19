import { Request, Response, NextFunction } from 'express';
import { success } from '../../shared/utils/response.js';
import { TierService } from './tier.service.js';
import { CreateTierInput, UpdateTierInput } from './tier.schema.js';

export class TierController {
  constructor(private readonly service: TierService) {}

  list = async (req: Request, res: Response, next: NextFunction) => {
    try { success(res, await this.service.list()); } catch (err) { next(err); }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try { success(res, await this.service.getById(Number(req.params.id))); } catch (err) { next(err); }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try { success(res, await this.service.create(req.body as CreateTierInput), 201); } catch (err) { next(err); }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try { success(res, await this.service.update(Number(req.params.id), req.body as UpdateTierInput)); } catch (err) { next(err); }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try { await this.service.delete(Number(req.params.id)); success(res, {}); } catch (err) { next(err); }
  };
}
