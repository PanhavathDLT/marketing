import { Request, Response, NextFunction } from 'express';
import { success } from '@shared/utils/response.js';
import { User } from '@prisma/client';
import { UserManagementService } from './user-management.service.js';

export class UserManagementController {
  constructor(private readonly service: UserManagementService) {}

  // ─── Users ─────────────────────────────────────────────────────────────────

  listUsers = async (_req: Request, res: Response, next: NextFunction) => {
    try { success(res, await this.service.listUsers()); } catch (err) { next(err); }
  };

  getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try { success(res, await this.service.getUserById(Number(req.params.id))); } catch (err) { next(err); }
  };

  createUser = async (req: Request, res: Response, next: NextFunction) => {
    try { success(res, await this.service.createUser(req.body), 201); } catch (err) { next(err); }
  };

  updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const callerId = (req.user as User).id;
      success(res, await this.service.updateUser(Number(req.params.id), req.body, callerId));
    } catch (err) { next(err); }
  };

  deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const callerId = (req.user as User).id;
      await this.service.deleteUser(Number(req.params.id), callerId);
      success(res, null);
    } catch (err) { next(err); }
  };

  // ─── Customers ─────────────────────────────────────────────────────────────

  listCustomers = async (_req: Request, res: Response, next: NextFunction) => {
    try { success(res, await this.service.listCustomers()); } catch (err) { next(err); }
  };

  getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
    try { success(res, await this.service.getCustomerById(Number(req.params.id))); } catch (err) { next(err); }
  };

  // ─── Roles ─────────────────────────────────────────────────────────────────

  listRoles = async (_req: Request, res: Response, next: NextFunction) => {
    try { success(res, await this.service.listRoles()); } catch (err) { next(err); }
  };

  getRoleById = async (req: Request, res: Response, next: NextFunction) => {
    try { success(res, await this.service.getRoleById(Number(req.params.id))); } catch (err) { next(err); }
  };

  createRole = async (req: Request, res: Response, next: NextFunction) => {
    try { success(res, await this.service.createRole(req.body), 201); } catch (err) { next(err); }
  };

  updateRole = async (req: Request, res: Response, next: NextFunction) => {
    try { success(res, await this.service.updateRole(Number(req.params.id), req.body)); } catch (err) { next(err); }
  };

  deleteRole = async (req: Request, res: Response, next: NextFunction) => {
    try { await this.service.deleteRole(Number(req.params.id)); success(res, null); } catch (err) { next(err); }
  };

  setRolePermissions = async (req: Request, res: Response, next: NextFunction) => {
    try { success(res, await this.service.setRolePermissions(Number(req.params.id), req.body)); } catch (err) { next(err); }
  };

  // ─── Permissions ───────────────────────────────────────────────────────────

  listPermissions = async (_req: Request, res: Response, next: NextFunction) => {
    try { success(res, await this.service.listPermissions()); } catch (err) { next(err); }
  };
}
