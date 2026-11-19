import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import path from 'path';
import { env } from '../../config/env.js';
import type { IStorageService } from './storage.interface.js';

function buildClient() {
  // AWS_ENDPOINT_URL_S3 from Neon is virtual-hosted style: https://{bucket}.storage.{region}.aws.neon.tech
  // Strip the bucket subdomain to get the base endpoint the SDK uses.
  const endpointUrl = new URL(env.AWS_ENDPOINT_URL_S3!);
  const baseEndpoint = `${endpointUrl.protocol}//${endpointUrl.hostname.replace(`${env.AWS_S3_BUCKET}.`, '')}`;

  return new S3Client({
    region: env.AWS_REGION,
    endpoint: baseEndpoint,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: false,
  });
}

export class S3StorageService implements IStorageService {
  private client = buildClient();

  async upload(file: Express.Multer.File): Promise<string> {
    const ext = path.extname(file.originalname).toLowerCase();
    const key = `uploads/${randomUUID()}${ext}`;

    await this.client.send(new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET!,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    // Return the public virtual-hosted URL
    return `${env.AWS_ENDPOINT_URL_S3}/${key}`;
  }

  async delete(publicUrl: string): Promise<void> {
    // Extract key from URL: everything after the endpoint
    const key = publicUrl.replace(`${env.AWS_ENDPOINT_URL_S3}/`, '');
    if (!key) return;

    await this.client.send(new DeleteObjectCommand({
      Bucket: env.AWS_S3_BUCKET!,
      Key: key,
    })).catch(() => {
      // ignore not-found
    });
  }
}
