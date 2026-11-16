import { z } from 'zod';

export const createMissionSchema = z.object({
  campaignId:    z.number().int().positive(),
  type:          z.enum(['REFERRAL', 'APPLICATION_SUBMISSION', 'LOAN_APPROVAL', 'REPAYMENT', 'COMPLETE_FORM1', 'COMPLETE_FORM2', 'COMPLETE_FORM3', 'COMPLETE_FORM4']),
  title:         z.string().min(1),
  points:        z.number().int().positive(),
  requiredCount: z.number().int().positive().default(1),
  startDate:     z.string().datetime(),
  endDate:       z.string().datetime(),
  iconUrl:       z.string().url().optional(),
});

export const updateMissionSchema = createMissionSchema.omit({ campaignId: true }).partial();

export type CreateMissionInput = z.infer<typeof createMissionSchema>;
export type UpdateMissionInput = z.infer<typeof updateMissionSchema>;
