import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { requireExternalServerClient } from '../../shared/middleware/external-server.middleware.js';
import { MissionRepository } from '../mission/mission.repository.js';
import { PartnerRepository } from '../partner/partner.repository.js';
import prisma from '../../lib/prisma.js';

const missionRepo = new MissionRepository(prisma);
const partnerRepo = new PartnerRepository(prisma);

const PARTNER_CONVERSION_TYPES = new Set(['APPLICATION_SUBMISSION', 'LOAN_APPROVAL']);

const losEventSchema = z.object({
  losUserId:   z.number().int(),
  missionType: z.enum([
    'REFERRAL',
    'APPLICATION_SUBMISSION',
    'LOAN_APPROVAL',
    'REPAYMENT',
    'COMPLETE_FORM1',
    'COMPLETE_FORM2',
    'COMPLETE_FORM3',
    'COMPLETE_FORM4',
  ]),
});

/** Generate a unique referral code for auto-created customers. */
async function uniqueReferralCode(): Promise<string> {
  let code = nanoid(6).toUpperCase();
  while (await prisma.customerProfile.findUnique({ where: { referralCode: code } })) {
    code = nanoid(6).toUpperCase();
  }
  return code;
}

/**
 * Find customer by losUserId. If not found, auto-create a marketing profile
 * so progress is tracked from this event onward. When the customer later opens
 * the mobile reward screen, POST /auth/session links the existing profile.
 *
 * Returns { userId, customerProfileId }.
 */
async function findOrCreateCustomer(losUserId: number): Promise<{ userId: number; customerProfileId: number }> {
  const existing = await prisma.customerProfile.findUnique({
    where: { losUserId },
    select: { userId: true, id: true },
  });
  if (existing) return { userId: existing.userId, customerProfileId: existing.id };

  const referralCode = await uniqueReferralCode();
  const profile = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { role: 'CUSTOMER' } });
    return tx.customerProfile.create({
      data: { userId: user.id, losUserId, referralCode },
      select: { userId: true, id: true },
    });
  });
  return { userId: profile.userId, customerProfileId: profile.id };
}

// Mounted at /api/v1/los
const router: IRouter = Router();

/**
 * POST /api/v1/los/missions/complete
 *
 * Called by the LOS backend (server-to-server) to report a qualifying event
 * for a customer. Auth: X-Client-Id + X-Client-Secret headers checked against
 * the MachineClient table.
 *
 * Always returns 200 — LOS flows must never break because of marketing state.
 */
router.post(
  '/missions/complete',
  requireExternalServerClient,
  validate(losEventSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { losUserId, missionType } = req.body as z.infer<typeof losEventSchema>;

      // 1. Resolve losUserId → User.id (auto-create if first event)
      const { userId, customerProfileId } = await findOrCreateCustomer(losUserId);

      // 2. Trigger active missions for this mission type
      const missions = await missionRepo.findActiveMissionsByType(missionType);

      if (missions.length === 0) {
        res.json({ status: 'success', data: { triggered: false, reason: 'no_active_mission' } });
        return;
      }

      const updated: { missionId: number; progress: number; requiredCount: number; status: string }[] = [];
      for (const mission of missions) {
        const row = await missionRepo.recordProgress(userId, mission);
        if (row) {
          updated.push({
            missionId:     mission.id,
            progress:      row.progress,
            requiredCount: mission.requiredCount,
            status:        row.status,
          });
        }
      }

      if (updated.length === 0) {
        res.json({ status: 'success', data: { triggered: false, reason: 'already_completed' } });
        return;
      }

      // 3. Record partner conversion for APPLICATION_SUBMISSION and LOAN_APPROVAL
      if (PARTNER_CONVERSION_TYPES.has(missionType)) {
        const usage = await partnerRepo.findUsageByCustomerId(customerProfileId);
        if (usage) {
          await partnerRepo.createConversion(usage.partnerCodeId, customerProfileId, missionType);
        }
      }

      res.json({ status: 'success', data: { triggered: true, missions: updated } });
    } catch (err) {
      next(err);
    }
  },
);

export { router as losRouter };
