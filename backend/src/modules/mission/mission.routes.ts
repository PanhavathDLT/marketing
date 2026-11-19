import { Router, IRouter } from 'express';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { requirePermission } from '../../shared/middleware/permission.middleware.js';
import { createMissionSchema, updateMissionSchema } from './mission.schema.js';
import { MissionRepository } from './mission.repository.js';
import { MissionService } from './mission.service.js';
import { MissionController } from './mission.controller.js';
import prisma from '../../lib/prisma.js';

// ─── Composition root ─────────────────────────────────────────────────────────
const repo = new MissionRepository(prisma);
const service = new MissionService(repo);
const controller = new MissionController(service);

// Admin standalone routes — mounted at /api/v1/admin/missions
export const adminMissionStandaloneRouter: IRouter = Router();

adminMissionStandaloneRouter.get('/types', requirePermission('MISSION', 'View'), controller.getMissionTypes);

// Admin routes — mounted at /api/v1/admin/campaigns/:campaignId/missions
export const adminMissionRouter: IRouter = Router({ mergeParams: true });

adminMissionRouter.get('/',       requirePermission('MISSION', 'View'),   controller.getMissionsForCampaign);
adminMissionRouter.post('/',      requirePermission('MISSION', 'Create'), validate(createMissionSchema), controller.create);
adminMissionRouter.patch('/:id',  requirePermission('MISSION', 'Update'), validate(updateMissionSchema), controller.update);
adminMissionRouter.delete('/:id', requirePermission('MISSION', 'Delete'), controller.delete);

// Note: customer-facing mission endpoints (/reward/missions) are served
// through the reward module to match the required path /customer/reward/missions
