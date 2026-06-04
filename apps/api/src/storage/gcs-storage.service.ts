import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { ObjectMetadata, SignedUrlResult, StorageService } from './storage.interface';

@Injectable()
export class GcsStorageService extends StorageService {
  private readonly storage: Storage;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    super();
    this.bucket = config.getOrThrow<string>('GCS_BUCKET');
    const projectId = config.get<string>('GCS_PROJECT_ID');
    const credentialsJson = config.get<string>('GCP_SERVICE_ACCOUNT_JSON');
    if (credentialsJson) {
      const credentials = JSON.parse(credentialsJson) as Record<string, unknown>;
      this.storage = new Storage({ projectId, credentials });
    } else {
      this.storage = new Storage({ projectId });
    }
  }

  getBucketName(): string {
    return this.bucket;
  }

  buildObjectKey(tenantId: string, documentId: string, fileName: string): string {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `tenants/${tenantId}/documents/${documentId}/${safeName}`;
  }

  async getUploadSignedUrl(
    objectKey: string,
    contentType: string,
    expiresInSeconds: number,
  ): Promise<SignedUrlResult> {
    const file = this.storage.bucket(this.bucket).file(objectKey);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: expiresAt,
      contentType,
    });
    return { uploadUrl, expiresAt };
  }

  async getDownloadSignedUrl(
    objectKey: string,
    expiresInSeconds: number,
  ): Promise<SignedUrlResult> {
    const file = this.storage.bucket(this.bucket).file(objectKey);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const [downloadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: expiresAt,
    });
    return { uploadUrl: downloadUrl, downloadUrl, expiresAt };
  }

  async getObjectMetadata(objectKey: string): Promise<ObjectMetadata> {
    const file = this.storage.bucket(this.bucket).file(objectKey);
    const [exists] = await file.exists();
    if (!exists) {
      return { exists: false, sizeBytes: 0, contentType: '' };
    }
    const [metadata] = await file.getMetadata();
    return {
      exists: true,
      sizeBytes: Number(metadata.size ?? 0),
      contentType: metadata.contentType ?? 'application/octet-stream',
    };
  }

  async deleteObject(objectKey: string): Promise<void> {
    await this.storage.bucket(this.bucket).file(objectKey).delete({ ignoreNotFound: true });
  }
}
