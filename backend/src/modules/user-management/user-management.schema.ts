import { z } from 'zod';

// ─── Users ────────────────────────────────────────────────────────────────────

export const createAdminUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  staffRoleId: z.number().int().positive().optional(),
});

export const updateAdminUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  staffRoleId: z.number().int().positive().nullable().optional(),
});

// ─── Roles ────────────────────────────────────────────────────────────────────

export const createRoleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
});

export const updateRoleSchema = createRoleSchema.partial();

export const setRolePermissionsSchema = z.object({
  permissionIds: z.array(z.number().int().positive()),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateAdminUserInput = z.infer<typeof createAdminUserSchema>;
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type SetRolePermissionsInput = z.infer<typeof setRolePermissionsSchema>;
