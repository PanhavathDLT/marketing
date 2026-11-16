import { Router, IRouter } from 'express';
import { validate } from '@shared/middleware/validate.middleware.js';
import { requirePermission, requireSuperAdmin } from '@shared/middleware/permission.middleware.js';
import {
  createAdminUserSchema, updateAdminUserSchema,
  createRoleSchema, updateRoleSchema, setRolePermissionsSchema,
} from './user-management.schema.js';
import { UserManagementRepository } from './user-management.repository.js';
import { UserManagementService } from './user-management.service.js';
import { UserManagementController } from './user-management.controller.js';
import prisma from '@lib/prisma.js';

// ─── Composition root ─────────────────────────────────────────────────────────
const repo       = new UserManagementRepository(prisma);
const service    = new UserManagementService(repo);
const controller = new UserManagementController(service);

// Mounted at /api/v1/admin/user-management
export const userManagementRouter: IRouter = Router();

// ─── Users (scoped admins with USER_MANAGEMENT permission) ────────────────────
userManagementRouter.get('/users',     requirePermission('USER_MANAGEMENT', 'View'),   controller.listUsers);
userManagementRouter.get('/users/:id', requirePermission('USER_MANAGEMENT', 'View'),   controller.getUserById);
userManagementRouter.post('/users',    requirePermission('USER_MANAGEMENT', 'Create'), validate(createAdminUserSchema), controller.createUser);
userManagementRouter.patch('/users/:id', requirePermission('USER_MANAGEMENT', 'Update'), validate(updateAdminUserSchema), controller.updateUser);
userManagementRouter.delete('/users/:id', requirePermission('USER_MANAGEMENT', 'Delete'), controller.deleteUser);

// ─── Roles & Permissions (super admin only) ───────────────────────────────────
userManagementRouter.get('/roles',                   requireSuperAdmin, controller.listRoles);
userManagementRouter.get('/roles/:id',               requireSuperAdmin, controller.getRoleById);
userManagementRouter.post('/roles',                  requireSuperAdmin, validate(createRoleSchema),          controller.createRole);
userManagementRouter.patch('/roles/:id',             requireSuperAdmin, validate(updateRoleSchema),          controller.updateRole);
userManagementRouter.delete('/roles/:id',            requireSuperAdmin, controller.deleteRole);
userManagementRouter.put('/roles/:id/permissions',   requireSuperAdmin, validate(setRolePermissionsSchema),  controller.setRolePermissions);

userManagementRouter.get('/permissions', requireSuperAdmin, controller.listPermissions);
