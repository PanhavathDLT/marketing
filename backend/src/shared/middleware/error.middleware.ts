import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '@shared/errors/AppError.js';

const isDev = process.env.NODE_ENV !== 'production';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ status: 'error', error: err.message });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation → 409
    if (err.code === 'P2002') {
      const fields = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'unknown field';
      res.status(409).json({
        status: 'error',
        error: 'Resource already exists or duplicate request.',
        ...(isDev && { debug: { prismaCode: err.code, fields } }),
      });
      return;
    }

    // All other known Prisma errors → 400 in prod, with detail in dev
    console.error(`[Prisma ${err.code}]`, err.message, err.meta);
    res.status(400).json({
      status: 'error',
      error: isDev ? `Database error: ${err.message}` : 'Database error.',
      ...(isDev && { debug: { prismaCode: err.code, meta: err.meta } }),
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    console.error('[Prisma validation]', err.message);
    res.status(400).json({
      status: 'error',
      error: isDev ? `Prisma validation: ${err.message}` : 'Invalid database query.',
    });
    return;
  }

  console.error(`[500] ${req.method} ${req.path}`, err);
  res.status(500).json({
    status: 'error',
    error: isDev ? err.message : 'Internal server error',
    ...(isDev && { debug: { name: err.name, stack: err.stack } }),
  });
}
