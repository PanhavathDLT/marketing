import { Request, Response, NextFunction } from 'express';
import { success } from '@shared/utils/response.js';
import { AuthService } from './auth.service.js';
import { LoginInput, SessionInput, RefreshTokenInput } from './auth.schema.js';

export class AuthController {
  constructor(private readonly service: AuthService) {}

  /** POST /auth/login — marketing admin dashboard */
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.service.login(req.body as LoginInput));
    } catch (err) { next(err); }
  };

  /** POST /auth/session — mobile Flutter customer (LOS token exchange) */
  session = async (req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.service.exchangeLosToken((req.body as SessionInput).losToken), 201);
    } catch (err) { next(err); }
  };

  /** POST /auth/refresh — both admin and mobile */
  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      success(res, await this.service.refreshTokens((req.body as RefreshTokenInput).refreshToken));
    } catch (err) { next(err); }
  };
}
