import { Router, IRouter } from 'express';
import { validate } from '@shared/middleware/validate.middleware.js';
import { requirePermission } from '@shared/middleware/permission.middleware.js';
import { createCampaignSchema, updateCampaignSchema } from './campaign.schema.js';
import { CampaignRepository } from './campaign.repository.js';
import { CampaignService } from './campaign.service.js';
import { CampaignController } from './campaign.controller.js';
import prisma from '@lib/prisma.js';

// ─── Composition root ─────────────────────────────────────────────────────────
const repo = new CampaignRepository(prisma);
const service = new CampaignService(repo);
const controller = new CampaignController(service);

// Admin routes (mounted at /api/v1/admin/campaigns)
export const adminCampaignRouter: IRouter = Router();
adminCampaignRouter.get('/',    requirePermission('CAMPAIGN', 'View'),   controller.list);
adminCampaignRouter.get('/:id', requirePermission('CAMPAIGN', 'View'),   controller.getById);
adminCampaignRouter.post('/',   requirePermission('CAMPAIGN', 'Create'), validate(createCampaignSchema), controller.create);
adminCampaignRouter.patch('/:id', requirePermission('CAMPAIGN', 'Update'), validate(updateCampaignSchema), controller.update);
adminCampaignRouter.delete('/:id', requirePermission('CAMPAIGN', 'Delete'), controller.delete);

// Customer routes (mounted at /api/v1/customer/campaigns)
export const customerCampaignRouter: IRouter = Router();
customerCampaignRouter.get('/', controller.listActive);
customerCampaignRouter.get('/:id', controller.getById);
