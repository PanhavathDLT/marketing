import { z } from 'zod';

export const PARTNER_CHANNELS = [
  'TIKTOK',
  'YOUTUBE',
  'FACEBOOK',
  'INSTAGRAM',
  'TELEGRAM',
  'TWITTER',
  'LINKEDIN',
  'OTHER',
] as const;

export type PartnerChannel = typeof PARTNER_CHANNELS[number];

const channelEnum = z.enum(PARTNER_CHANNELS);

export const createPartnerSchema = z.object({
  name:    z.string().min(1),
  phone:   z.string().optional(),
  channel: channelEnum.optional(),
  note:    z.string().optional(),
  // Optional: provide a custom code. If omitted, the backend auto-generates one.
  // Must be 3–20 alphanumeric characters (letters and digits only, no spaces).
  code:    z.string().regex(/^[A-Z0-9]{3,20}$/, 'Code must be 3–20 uppercase alphanumeric characters').optional(),
});

export const updatePartnerSchema = z.object({
  name:    z.string().min(1).optional(),
  phone:   z.string().nullable().optional(),
  channel: channelEnum.nullable().optional(),
  note:    z.string().nullable().optional(),
});

export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;
