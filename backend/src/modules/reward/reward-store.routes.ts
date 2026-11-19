import { Router, IRouter } from 'express';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { requirePermission } from '../../shared/middleware/permission.middleware.js';
import { createRewardItemSchema, updateRewardItemSchema, updateRedemptionStatusSchema } from './reward-store.schema.js';
import { RewardRepository } from './reward.repository.js';
import { RewardStoreService } from './reward-store.service.js';
import { RewardStoreController } from './reward-store.controller.js';
import prisma from '../../lib/prisma.js';

// ─── Composition root ─────────────────────────────────────────────────────────
const repo = new RewardRepository(prisma);
const service = new RewardStoreService(repo);
const controller = new RewardStoreController(service);

// Admin routes — mounted at /api/v1/admin/reward/store
export const adminRewardStoreRouter: IRouter = Router();

// Static paths first — must come before /:id to avoid being swallowed as a param
adminRewardStoreRouter.get('/redemptions',           requirePermission('REWARD_STORE', 'View'),   controller.listRedemptions);
adminRewardStoreRouter.patch('/redemptions/:id/status', requirePermission('REWARD_STORE', 'Update'), validate(updateRedemptionStatusSchema), controller.updateRedemptionStatus);

// Store item CRUD
adminRewardStoreRouter.get('/',      requirePermission('REWARD_STORE', 'View'),   controller.list);
adminRewardStoreRouter.get('/:id',   requirePermission('REWARD_STORE', 'View'),   controller.getById);
adminRewardStoreRouter.post('/',     requirePermission('REWARD_STORE', 'Create'), validate(createRewardItemSchema), controller.create);
adminRewardStoreRouter.patch('/:id', requirePermission('REWARD_STORE', 'Update'), validate(updateRewardItemSchema), controller.update);
adminRewardStoreRouter.delete('/:id', requirePermission('REWARD_STORE', 'Delete'), controller.delete);
