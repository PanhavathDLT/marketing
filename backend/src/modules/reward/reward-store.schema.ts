import { z } from 'zod';

export const createRewardItemSchema = z.object({
  title: z.string().min(1),
  points: z.number().int().positive(),
  imageUrl: z.string().url().optional(),
  stock: z.number().int().min(0),
  isActive: z.boolean().optional().default(true),
});

export const updateRewardItemSchema = createRewardItemSchema.partial();

export type CreateRewardItemInput = z.infer<typeof createRewardItemSchema>;
export type UpdateRewardItemInput = z.infer<typeof updateRewardItemSchema>;

export const updateRedemptionStatusSchema = z.object({
  status: z.enum(['PENDING_PICKUP', 'COLLECTED', 'EXPIRED']),
});
