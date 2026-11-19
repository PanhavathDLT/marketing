import { env } from '../../config/env.js';
import prisma from '../../lib/prisma.js';
import type { IStorageService } from './storage.interface.js';

function idFromUrl(url: string): string {
  const parts = url.split('/files/');
  return parts[parts.length - 1];
}

export class DbStorageService implements IStorageService {
  async upload(file: Express.Multer.File): Promise<string> {
    const stored = await prisma.storedFile.create({
      data: {
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        data: new Uint8Array(file.buffer),
      },
    });
    return `${env.APP_URL}/files/${stored.id}`;
  }

  async delete(publicUrl: string): Promise<void> {
    const id = idFromUrl(publicUrl);
    await prisma.storedFile.delete({ where: { id } }).catch(() => {
      // ignore not-found
    });
  }
}
