import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { verifyLosCustomerToken } from '../../lib/los-jwks.js';
import { LoginInput } from './auth.schema.js';
import { AuthRepository } from './auth.repository.js';
import { toUserDTO } from './auth.mapper.js';

export class AuthService {
  constructor(private readonly repo: AuthRepository) {}

  private async uniqueReferralCode(): Promise<string> {
    let code = nanoid(6).toUpperCase();
    while (await this.repo.findByReferralCode(code)) {
      code = nanoid(6).toUpperCase();
    }
    return code;
  }

  private refreshTokenExpiresAt(): Date {
    // Parse env.JWT_REFRESH_EXPIRES_IN (e.g. "7d") into a Date
    const raw = env.JWT_REFRESH_EXPIRES_IN;
    const match = raw.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error(`Cannot parse JWT_REFRESH_EXPIRES_IN: ${raw}`);
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const ms: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return new Date(Date.now() + value * ms[unit]);
  }

  private async signTokens(userId: number, role: string) {
    const accessToken = jwt.sign({ id: userId, role }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
    const refreshToken = jwt.sign({ id: userId, role }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
    await this.repo.saveRefreshToken(userId, refreshToken, this.refreshTokenExpiresAt());
    return { accessToken, refreshToken };
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────

  /** Email + password login — for marketing admin dashboard users only. */
  async login(input: LoginInput) {
    const user = await this.repo.findByEmail(input.email);
    if (!user || !user.staffProfile?.password) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(input.password, user.staffProfile.password);
    if (!isMatch) throw new AppError('Invalid email or password', 401);

    const tokens = await this.signTokens(user.id, user.role);
    return { user: toUserDTO(user), ...tokens };
  }

  // ─── Mobile customer ───────────────────────────────────────────────────────

  /**
   * LOS token exchange — for mobile Flutter customers.
   *
   * Verifies the LOS access token via JWKS, then find-or-creates a marketing
   * account for this customer. The user never registers separately.
   *
   * Matching priority:
   *   1. losUserId  (reliable, stable)
   *   2. phone      (fallback for accounts created before LOS integration)
   */
  async exchangeLosToken(losToken: string) {
    const { losUserId, phone } = await verifyLosCustomerToken(losToken);

    let user = await this.repo.findByLosUserId(losUserId);

    if (!user) {
      // Fallback: existing account created via old registration flow
      const byPhone = await this.repo.findByPhone(phone);
      if (byPhone) {
        user = await this.repo.linkLosUserId(byPhone.id, losUserId);
      } else {
        // Auto-create — the customer never sees a registration screen
        user = await this.repo.createLosCustomer({
          losUserId,
          phone,
          referralCode: await this.uniqueReferralCode(),
        });
      }
    }

    const tokens = await this.signTokens(user.id, user.role);
    return { user: toUserDTO(user), ...tokens };
  }

  // ─── Shared ────────────────────────────────────────────────────────────────

  async refreshTokens(token: string) {
    const record = await this.repo.findRefreshToken(token);
    if (!record) throw new AppError('Invalid or expired refresh token', 401);

    const { user } = record;
    const newRefreshToken = nanoid(64);
    await this.repo.rotateRefreshToken(token, newRefreshToken, this.refreshTokenExpiresAt());

    const accessToken = jwt.sign({ id: user.id, role: user.role }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
    // Save new refresh token
    const newRefreshJwt = jwt.sign({ id: user.id, role: user.role }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
    await this.repo.saveRefreshToken(user.id, newRefreshJwt, this.refreshTokenExpiresAt());

    return { accessToken, refreshToken: newRefreshJwt };
  }
}
