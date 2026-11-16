import { env } from '@config/env.js';
import { LocalStorageService } from './local.storage.js';
import { CloudinaryStorageService } from './cloudinary.storage.js';
import { DbStorageService } from './db.storage.js';
import type { IStorageService } from './storage.interface.js';

export type { IStorageService };

let instance: IStorageService | null = null;

/** Returns the singleton storage service selected by STORAGE_DRIVER env var. */
export function getStorageService(): IStorageService {
  if (!instance) {
    if (env.STORAGE_DRIVER === 'cloudinary') {
      instance = new CloudinaryStorageService();
    } else if (env.STORAGE_DRIVER === 'db') {
      instance = new DbStorageService();
    } else {
      instance = new LocalStorageService();
    }
  }
  return instance;
}
