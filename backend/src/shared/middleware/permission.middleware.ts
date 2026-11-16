import { Request, Response, NextFunction } from 'express';
import { error } from '@shared/utils/response.js';
import { AuthenticatedUser } from '../../types/express.js';

// ─── In-memory permission cache (5-min TTL, no Redis needed) ─────────────────

type CacheEntry = { perms: Set<string>; expiresAt: number };
const cache = new Map<number, CacheEntry>();
const TTL_MS = 5 * 60 * 1000;

async function resolvePermissions(staffRoleId: number): Promise<Set<string>> {
  const entry = cache.get(staffRoleId);
  if (entry && entry.expiresAt > Date.now()) return entry.perms;

  // The staffProfile already has the role + permissions loaded via passport
  // but we keep a cache here for direct calls that may not have the full object.
  // Import prisma lazily to avoid circular deps.
  const { default: prisma } = await import('@lib/prisma.js');
  const rows = await prisma.staffRolePermission.findMany({
    where: { staffRoleId },
    include: { permission: true },
  });

  const perms = new Set(rows.map((r) => `${r.permission.module}:${r.permission.action}`));
  cache.set(staffRoleId, { perms, expiresAt: Date.now() + TTL_MS });
  return perms;
}

/** Call after any role-permission change to force a fresh DB lookup. */
export function invalidatePermissionCache(staffRoleId?: number): void {
  if (staffRoleId !== undefined) {
    cache.delete(staffRoleId);
  } else {
    cache.clear();
  }
}

// ─── Middleware factory ───────────────────────────────────────────────────────

/**
 * requirePermission('CAMPAIGN', 'View')
 *
 * Super admins (role = ADMIN, staffProfile.staffRoleId = null) bypass all checks.
 * Scoped admins (staffProfile.staffRoleId set) must have the (module, action) in their role.
 */
export function requirePermission(module: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user as AuthenticatedUser;

    // Super admin — bypass
    if (user.role === 'ADMIN' && user.staffProfile?.staffRoleId === null) {
      next();
      return;
    }

    const staffRoleId = user.staffProfile?.staffRoleId;
    if (!staffRoleId) {
      error(res, 'Forbidden', 403);
      return;
    }

    try {
      const perms = await resolvePermissions(staffRoleId);
      if (!perms.has(`${module}:${action}`)) {
        error(res, 'Forbidden', 403);
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * requireSuperAdmin — only the seeded super admin (staffProfile.staffRoleId = null) may access.
 * Used to guard role / permission management endpoints.
 */
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const user = req.user as AuthenticatedUser;
  if (user.role === 'ADMIN' && user.staffProfile?.staffRoleId === null) {
    next();
    return;
  }
  error(res, 'Forbidden — super admin only', 403);
};
