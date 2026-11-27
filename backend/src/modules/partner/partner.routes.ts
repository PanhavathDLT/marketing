import { Router, IRouter, Request, Response } from 'express';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { createPartnerSchema, updatePartnerSchema, PARTNER_CHANNELS } from './partner.schema.js';
import { PartnerRepository } from './partner.repository.js';
import { PartnerService } from './partner.service.js';
import { PartnerController } from './partner.controller.js';
import { success } from '../../shared/utils/response.js';
import prisma from '../../lib/prisma.js';

// ─── Composition root ─────────────────────────────────────────────────────────
const repo       = new PartnerRepository(prisma);
const service    = new PartnerService(repo);
const controller = new PartnerController(service);

const CHANNEL_LABELS: Record<string, string> = {
  TIKTOK:    'TikTok',
  YOUTUBE:   'YouTube',
  FACEBOOK:  'Facebook',
  INSTAGRAM: 'Instagram',
  TELEGRAM:  'Telegram',
  TWITTER:   'Twitter / X',
  LINKEDIN:  'LinkedIn',
  OTHER:     'Other',
};

// Mounted at /api/v1/admin/partners (auth applied by parent router)
const router: IRouter = Router();

// /channels must come before /:id so Express doesn't treat "channels" as an id
router.get('/channels', (_req: Request, res: Response) => {
  success(res, PARTNER_CHANNELS.map((value) => ({ value, label: CHANNEL_LABELS[value] })));
});

router.get('/',           controller.list);
router.post('/',          validate(createPartnerSchema), controller.create);
router.get('/:id',        controller.getById);
router.patch('/:id',      validate(updatePartnerSchema), controller.update);
router.delete('/:id',     controller.deactivate);
router.get('/:id/usages', controller.getUsages);

export { router as partnerRouter };
export { repo as partnerRepo };
