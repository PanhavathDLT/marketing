import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '@lib/prisma.js';

/**
 * Protects endpoints that are called by trusted external server clients
 * (e.g. the LOS backend).
 *
 * The caller must provide both headers:
 *   X-Client-Id:     <clientId>      — identifies which external service this is
 *   X-Client-Secret: <clientSecret>  — proves the caller is who they claim
 *
 * clientSecret is stored bcrypt-hashed in the MachineClient table.
 */
export async function requireExternalServerClient(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const clientId = req.headers['x-client-id'];
  const clientSecret = req.headers['x-client-secret'];

  if (!clientId || !clientSecret || typeof clientId !== 'string' || typeof clientSecret !== 'string') {
    res.status(401).json({ status: 'error', error: 'Unauthorized' });
    return;
  }

  const client = await prisma.machineClient.findUnique({ where: { clientId } });
  if (!client) {
    res.status(401).json({ status: 'error', error: 'Unauthorized' });
    return;
  }

  const valid = await bcrypt.compare(clientSecret, client.clientSecret);
  if (!valid) {
    res.status(401).json({ status: 'error', error: 'Unauthorized' });
    return;
  }

  next();
}
