import { Router, IRouter } from 'express';
import { requirePermission } from '@shared/middleware/permission.middleware.js';
import { SettingsRepository } from './settings.repository.js';
import { SettingsService } from './settings.service.js';
import { SettingsController } from './settings.controller.js';
import prisma from '@lib/prisma.js';

// ─── Composition root ─────────────────────────────────────────────────────────
const repo = new SettingsRepository(prisma);
const service = new SettingsService(repo);
const controller = new SettingsController(service);

// Admin only — mounted at /api/v1/admin/settings
const router: IRouter = Router();

router.get('/referral',   requirePermission('SETTINGS', 'View'),   controller.getReferralConfig);
router.patch('/referral', requirePermission('SETTINGS', 'Update'), controller.updateReferralConfig);

export default router;
