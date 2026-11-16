import { Router, IRouter } from 'express';
import { validate } from '@shared/middleware/validate.middleware.js';
import { requirePermission } from '@shared/middleware/permission.middleware.js';
import { createTierSchema, updateTierSchema } from './tier.schema.js';
import { TierRepository } from './tier.repository.js';
import { TierService } from './tier.service.js';
import { TierController } from './tier.controller.js';
import prisma from '@lib/prisma.js';

const repo = new TierRepository(prisma);
const service = new TierService(repo);
const controller = new TierController(service);

// Admin CRUD — mounted at /api/v1/admin/tiers
export const adminTierRouter: IRouter = Router();
adminTierRouter.get('/',      requirePermission('TIER', 'View'),   controller.list);
adminTierRouter.get('/:id',   requirePermission('TIER', 'View'),   controller.getById);
adminTierRouter.post('/',     requirePermission('TIER', 'Create'), validate(createTierSchema), controller.create);
adminTierRouter.patch('/:id', requirePermission('TIER', 'Update'), validate(updateTierSchema), controller.update);
adminTierRouter.delete('/:id', requirePermission('TIER', 'Delete'), controller.delete);

// Customer read-only — mounted at /api/v1/customer/tiers
export const customerTierRouter: IRouter = Router();
customerTierRouter.get('/', controller.list);
