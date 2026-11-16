import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '@config/env.js';
import { AppError } from '@shared/errors/AppError.js';

const getJWKS = (() => {
  let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
  return () => {
    if (!jwks) jwks = createRemoteJWKSet(new URL(env.LOS_JWKS_URI));
    return jwks;
  };
})();

export type LosCustomerClaims = {
  losUserId: number;
  phone: string; // LOS uses phone as `username` for customers
};

export async function verifyLosCustomerToken(token: string): Promise<LosCustomerClaims> {
  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: env.LOS_ISSUER,
      audience: env.LOS_CUSTOMER_AUDIENCE,
    });

    if (payload['type'] !== 'customer') {
      throw new AppError('Not a customer token', 401);
    }
    if (payload['tokenType'] !== 'access') {
      throw new AppError('Not an access token', 401);
    }

    const losUserId = payload['userId'];
    const phone = payload['username'];

    if (typeof losUserId !== 'number' || typeof phone !== 'string') {
      throw new AppError('Invalid LOS token payload', 401);
    }

    return { losUserId, phone };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Invalid or expired LOS token', 401);
  }
}
