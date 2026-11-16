import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { env } from '@config/env.js';
import type { IStorageService } from './storage.interface.js';

// Files land in <project-root>/public/uploads/ and are served by express.static('public')
const UPLOAD_DIR = path.resolve('public/uploads');

export class LocalStorageService implements IStorageService {
  async upload(file: Express.Multer.File): Promise<string> {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${randomUUID()}${ext}`;

    await fs.writeFile(path.join(UPLOAD_DIR, filename), file.buffer);

    return `${env.APP_URL}/uploads/${filename}`;
  }

  async delete(publicUrl: string): Promise<void> {
    const filename = publicUrl.split('/uploads/').at(-1);
    if (!filename) return;
    await fs.unlink(path.join(UPLOAD_DIR, filename)).catch(() => {
      // ignore — file may have already been removed
    });
  }
}
