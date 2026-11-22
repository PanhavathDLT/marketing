import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import path from 'path';
import { env } from '../../config/env.js';
import type { IStorageService } from './storage.interface.js';

// Must exist with Public visibility on every Neon branch that uses STORAGE_DRIVER=s3.
const BUCKET = 'uploads';

function buildClient() {
  return new S3Client({
    region: env.AWS_REGION,
    endpoint: env.AWS_ENDPOINT_URL_S3,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true, // Neon only supports path-style: https://<endpoint>/<bucket>/<key>
  });
}

export class S3StorageService implements IStorageService {
  private client = buildClient();
  private publicBaseUrl = `${env.AWS_ENDPOINT_URL_S3}/${BUCKET}/`;

  async upload(file: Express.Multer.File): Promise<string> {
    const ext = path.extname(file.originalname).toLowerCase();
    const key = `${randomUUID()}${ext}`;

    await this.client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    return `${this.publicBaseUrl}${key}`;
  }

  async delete(publicUrl: string): Promise<void> {
    // Ignore URLs from another environment or storage driver
    if (!publicUrl.startsWith(this.publicBaseUrl)) return;

    const key = publicUrl.slice(this.publicBaseUrl.length);
    if (!key) return;

    await this.client.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })).catch(() => {
      // ignore not-found
    });
  }
}
