import { Router, IRouter } from 'express';
import { validate } from '@shared/middleware/validate.middleware.js';
import { z } from 'zod';
import { rewardController } from './reward.routes.js';

const applyReferralSchema = z.object({
  code: z.string().min(1, 'Referral code is required'),
});

// Mounted at /api/v1/customer/referral
// Shares the same controller instance created in reward.routes.ts
const router: IRouter = Router();

router.get('/my-code', rewardController.getMyReferralCode);
router.post('/apply', validate(applyReferralSchema), rewardController.applyReferralCode);

export default router;
