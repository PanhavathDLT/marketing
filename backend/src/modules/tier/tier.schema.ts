import { z } from 'zod';

export const createTierSchema = z.object({
  name: z.string().min(1).max(50).transform((v) => v.toUpperCase().trim()),
  minPoints: z.number().int().min(0),
  iconUrl: z.string().url().nullable().optional(),
});

export const updateTierSchema = z.object({
  name: z.string().min(1).max(50).transform((v) => v.toUpperCase().trim()).optional(),
  minPoints: z.number().int().min(0).optional(),
  iconUrl: z.string().url().nullable().optional(),
});

export type CreateTierInput = z.infer<typeof createTierSchema>;
export type UpdateTierInput = z.infer<typeof updateTierSchema>;
