import { Router, IRouter } from 'express';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { loginSchema, sessionSchema, refreshTokenSchema } from './auth.schema.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import prisma from '../../lib/prisma.js';

// ─── Composition root ─────────────────────────────────────────────────────────
const repo       = new AuthRepository(prisma);
const service    = new AuthService(repo);
const controller = new AuthController(service);

const router: IRouter = Router();

// Admin dashboard — email + password
router.post('/login',   validate(loginSchema),        controller.login);

// Mobile customer — exchange LOS access token for a marketing session
router.post('/session', validate(sessionSchema),       controller.session);

// Both — refresh marketing tokens
router.post('/refresh', validate(refreshTokenSchema),  controller.refresh);

export default router;
