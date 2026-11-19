import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { success } from '../../shared/utils/response.js';
import { MissionRepository } from './mission.repository.js';
import type { AuthenticatedUser } from '../../types/express.js';
import prisma from '../../lib/prisma.js';

const missionRepo = new MissionRepository(prisma);


// REFERRAL is excluded — referral mission progress is recorded automatically
// inside POST /customer/referral/apply, not triggered by the mobile app.
const triggerSchema = z.object({
  missionType: z.enum([
    'APPLICATION_SUBMISSION',
    'LOAN_APPROVAL',
    'REPAYMENT',
    'COMPLETE_FORM1',
    'COMPLETE_FORM2',
    'COMPLETE_FORM3',
    'COMPLETE_FORM4',
  ]),
});

// Mounted at /api/v1/customer — auth (authenticate + requireRole('CUSTOMER')) applied by parent router
export const customerMissionRouter: IRouter = Router();

/**
 * POST /customer/missions/complete
 *
 * Called by the mobile app when the customer completes a mission condition
 * (e.g. submitted an application, made a repayment).
 *
 * REFERRAL is not accepted here — referral mission progress is recorded
 * automatically inside POST /customer/referral/apply.
 *
 * Returns 200 even when no matching mission is found so the mobile app does
 * not need to handle this as an error.
 */
customerMissionRouter.post(
  '/complete',
  validate(triggerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = (req.user as AuthenticatedUser).id;
      const { missionType } = req.body as z.infer<typeof triggerSchema>;

      const missions = await missionRepo.findActiveMissionsByType(missionType);
      if (missions.length === 0) {
        return success(res, { triggered: false, reason: 'no_active_mission' });
      }

      const updated: { missionId: number; progress: number; requiredCount: number; status: string }[] = [];
      for (const mission of missions) {
        const row = await missionRepo.recordProgress(customerId, mission);
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
