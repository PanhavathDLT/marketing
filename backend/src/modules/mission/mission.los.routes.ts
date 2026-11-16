import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MissionType } from '@prisma/client';
import { nanoid } from 'nanoid';
import { validate } from '@shared/middleware/validate.middleware.js';
import { requireExternalServerClient } from '@shared/middleware/external-server.middleware.js';
import { success } from '@shared/utils/response.js';
import { MissionRepository } from './mission.repository.js';
import prisma from '@lib/prisma.js';

const missionRepo = new MissionRepository(prisma);

/**
 * Find or create a CustomerProfile by losUserId.
 *
 * Called by the LOS trigger before any mission logic. A customer may not have
 * opened the marketing app yet — their profile is created here so progress is
 * tracked from the moment they qualify. When they eventually open the reward
 * screen, POST /auth/session finds this profile by losUserId and links it up.
 */
async function findOrCreateCustomerByLosUserId(losUserId: number) {
  const existing = await prisma.customerProfile.findUnique({ where: { losUserId } });
  if (existing) return existing;

  // Generate a unique referral code
  let referralCode = nanoid(6).toUpperCase();
  while (await prisma.customerProfile.findUnique({ where: { referralCode } })) {
    referralCode = nanoid(6).toUpperCase();
  }

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { role: 'CUSTOMER' } });
    return tx.customerProfile.create({
      data: { userId: user.id, losUserId, referralCode },
    });
  });
}

const triggerSchema = z.object({
  losUserId: z.number().int().positive(),
  missionType: z.nativeEnum(MissionType),
});

// Mounted at /api/v1/los
export const missionLosRouter: IRouter = Router();

missionLosRouter.use(requireExternalServerClient);

/**
 * POST /los/missions/complete
 *
 * Called by the LOS backend when a customer completes a mission condition
 * (e.g. made a repayment on time, applied for a loan before campaign deadline).
 *
 * The LOS owns all business logic for WHEN a mission is completed.
 * This endpoint increments the customer's mission progress by 1.
 * When progress reaches requiredCount the mission becomes CLAIMABLE.
 *
 * Returns 200 even when no matching mission is found (customer not enrolled
 * in the marketing program, or campaign is inactive) — LOS should not
 * fail its own flow because of a marketing system state.
 */
missionLosRouter.post(
  '/missions/complete',
  validate(triggerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { losUserId, missionType } = req.body as z.infer<typeof triggerSchema>;

      // Auto-create profile if the customer hasn't opened the marketing app yet.
      // When they eventually do, POST /auth/session will find this profile by losUserId.
      const customerProfile = await findOrCreateCustomerByLosUserId(losUserId);

      // One event counts toward every active mission of this type
      // (e.g. two campaigns each running a REFERRAL mission).
      const missions = await missionRepo.findActiveMissionsByType(missionType);
      if (missions.length === 0) {
        return success(res, { triggered: false, reason: 'no_active_mission' });
      }

      const updated: { missionId: number; progress: number; requiredCount: number; status: string }[] = [];
      for (const mission of missions) {
        const row = await missionRepo.recordProgress(customerProfile.userId, mission);
        if (row) {
          updated.push({
            missionId: mission.id,
            progress: row.progress,
            requiredCount: mission.requiredCount,
            status: row.status,
          });
        }
      }

      if (updated.length === 0) {
        return success(res, { triggered: false, reason: 'already_completed' });
      }
      success(res, { triggered: true, missions: updated });
    } catch (err) {
      next(err);
    }
  },
);
