import { z } from 'zod';

// Admin dashboard login
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Mobile customer — LOS token exchange
export const sessionSchema = z.object({
  losToken: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SessionInput = z.infer<typeof sessionSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
