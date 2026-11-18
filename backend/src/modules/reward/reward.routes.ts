import { Router, IRouter } from 'express';
import { validate } from '@shared/middleware/validate.middleware.js';
import { z } from 'zod';
import { RewardRepository } from './reward.repository.js';
import { RewardService } from './reward.service.js';
import { RewardController } from './reward.controller.js';
import { MissionRepository } from '@modules/mission/mission.repository.js';
import { MissionService } from '@modules/mission/mission.service.js';
import { TierRepository } from '@modules/tier/index.js';
import { SettingsRepository } from '@modules/settings/settings.repository.js';
import prisma from '@lib/prisma.js';

// ─── Composition root ─────────────────────────────────────────────────────────
const tierRepo = new TierRepository(prisma);
const settingsRepo = new SettingsRepository(prisma);

const rewardRepo = new RewardRepository(prisma);
const rewardService = new RewardService(rewardRepo, tierRepo, settingsRepo);

const missionRepo = new MissionRepository(prisma);
const missionService = new MissionService(missionRepo);

export const rewardController = new RewardController(rewardService, missionService);

// ─── Routes (mounted at /api/v1/customer/reward) ──────────────────────────────
const router: IRouter = Router();

router.get('/points', rewardController.getPoints);
router.get('/points/history', rewardController.getPointsHistory);
router.get('/check-in', rewardController.getCheckIn);
router.post('/check-in', rewardController.checkIn);
router.get('/missions', rewardController.getCustomerMissions);
router.post('/missions/:missionId/claim', rewardController.claimMission);
router.get('/store', rewardController.getStore);
router.post('/store/:rewardId/redeem', rewardController.redeemReward);
router.get('/my-rewards', rewardController.getMyRewards);
router.patch('/loan-cycle', validate(z.object({ loanCount: z.number().int().min(0) })), rewardController.updateLoanCycle);

export default router;
