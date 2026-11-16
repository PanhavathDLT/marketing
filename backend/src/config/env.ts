import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),

  // LOS integration
  LOS_JWKS_URI: z.string().url().default('https://api.los.delightech.asia/api/v1/guest/.well-known/jwks.json'),
  LOS_ISSUER: z.string().default('los-backend'),
  LOS_CUSTOMER_AUDIENCE: z.string().default('luyleun'),
  // Storage
  STORAGE_DRIVER: z.enum(['local', 'cloudinary']).default('local'),
  APP_URL: z.string().url().default('http://localhost:3000'),

  // Cloudinary (required only when STORAGE_DRIVER=cloudinary)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
