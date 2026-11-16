import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { env } from '@config/env.js';
import type { IStorageService } from './storage.interface.js';

function getClient() {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key:    env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

/** Extract the Cloudinary public_id from a secure_url so we can delete it later. */
function publicIdFromUrl(url: string): string {
  // e.g. https://res.cloudinary.com/<cloud>/image/upload/v1234567890/marketing/abc123.jpg
  // → marketing/abc123   (strip version segment and extension)
  const parts = url.split('/upload/');
  if (parts.length < 2) return url;
  const withoutVersion = parts[1].replace(/^v\d+\//, '');
  return withoutVersion.replace(/\.[^.]+$/, ''); // strip extension
}

export class CloudinaryStorageService implements IStorageService {
  async upload(file: Express.Multer.File): Promise<string> {
    const client = getClient();

    return new Promise((resolve, reject) => {
      const uploadStream = client.uploader.upload_stream(
        { folder: 'marketing', resource_type: 'image' },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'));
          resolve(result.secure_url);
        },
      );
      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  async delete(publicUrl: string): Promise<void> {
    const client = getClient();
    const publicId = publicIdFromUrl(publicUrl);
    await client.uploader.destroy(publicId, { resource_type: 'image' });
  }
}
