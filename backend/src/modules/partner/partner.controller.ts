import { Request, Response, NextFunction } from 'express';
import { success } from '../../shared/utils/response.js';
import { PartnerService } from './partner.service.js';

export class PartnerController {
  constructor(private readonly service: PartnerService) {}

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

  deactivate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deactivate(Number(req.params.id));
      success(res, null);
    } catch (err) { next(err); }
  };

  getUsages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.service.getUsages(Number(req.params.id)));
    } catch (err) { next(err); }
  };
}
