import { Router, IRouter } from 'express';
import { authenticate, requireRole } from '../shared/middleware/auth.middleware.js';
import { authRouter } from '../modules/auth/index.js';
import { adminCampaignRouter, customerCampaignRouter } from '../modules/campaign/index.js';
import { adminMissionRouter, adminMissionStandaloneRouter, customerMissionRouter } from '../modules/mission/index.js';
import { analyticsRouter } from '../modules/analytics/index.js';
import { rewardRouter, referralRouter, adminRewardStoreRouter } from '../modules/reward/index.js';
import { userManagementRouter } from '../modules/user-management/index.js';
import { uploadRouter } from '../modules/upload/upload.routes.js';
import { adminTierRouter, customerTierRouter } from '../modules/tier/index.js';
import { settingsRouter } from '../modules/settings/index.js';
import { partnerRouter } from '../modules/partner/index.js';
import { losRouter } from '../modules/los/los.routes.js';

const router: IRouter = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.use('/auth', authRouter);

// ─── Customer ─────────────────────────────────────────────────────────────────
const customer: IRouter = Router();
customer.use(authenticate, requireRole('CUSTOMER'));

customer.use('/campaigns', customerCampaignRouter);
customer.use('/reward', rewardRouter);           // /reward/points, /reward/missions, /reward/store, etc.
customer.use('/referral', referralRouter);       // /referral/my-code, /referral/apply
customer.use('/tiers', customerTierRouter);
customer.use('/missions', customerMissionRouter); // /missions/complete

router.use('/customer', customer);

// ─── Admin ────────────────────────────────────────────────────────────────────
const admin: IRouter = Router();
admin.use(authenticate, requireRole('ADMIN'));

admin.use('/campaigns', adminCampaignRouter);
admin.use('/campaigns/:campaignId/missions', adminMissionRouter);
admin.use('/missions', adminMissionStandaloneRouter);
admin.use('/reward/store', adminRewardStoreRouter);
admin.use('/analytics', analyticsRouter);
admin.use('/user-management', userManagementRouter);
admin.use('/upload', uploadRouter);
admin.use('/tiers', adminTierRouter);
admin.use('/settings', settingsRouter);
admin.use('/partners', partnerRouter);

router.use('/admin', admin);

// ─── LOS (server-to-server) ────────────────────────────────────────────────────
router.use('/los', losRouter);

export default router;
