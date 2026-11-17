import { Router, IRouter } from 'express';
import { requirePermission } from '@shared/middleware/permission.middleware.js';
import { AnalyticsRepository } from './analytics.repository.js';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsController } from './analytics.controller.js';
import prisma from '@lib/prisma.js';

// ─── Composition root ─────────────────────────────────────────────────────────
const repo = new AnalyticsRepository(prisma);
const service = new AnalyticsService(repo);
const controller = new AnalyticsController(service);

// Admin only — mounted at /api/v1/admin/analytics
const router: IRouter = Router();

router.get('/overview',                requirePermission('ANALYTICS', 'View'), controller.getOverview);
router.get('/campaigns/:campaignId',   requirePermission('ANALYTICS', 'View'), controller.getCampaignStats);
router.get('/check-ins',               requirePermission('ANALYTICS', 'View'), controller.getCheckInStats);
router.get('/referrals',               requirePermission('ANALYTICS', 'View'), controller.getReferrals);

export default router;
