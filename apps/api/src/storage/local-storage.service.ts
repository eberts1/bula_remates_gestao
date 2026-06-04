import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ObjectMetadata, SignedUrlResult, StorageService } from './storage.interface';

/**
 * Armazenamento local para desenvolvimento sem GCS.
 * URLs apontam para endpoints da própria API que fazem proxy do arquivo.
 */
@Injectable()
export class LocalStorageService extends StorageService {
  private readonly baseDir: string;
  private readonly apiUrl: string;
  private readonly bucket = 'local-dev';

  constructor(config: ConfigService) {
    super();
    this.baseDir = path.resolve(config.get('LOCAL_STORAGE_PATH', './uploads'));
    this.apiUrl = config.get('API_URL', 'http://localhost:4000');
  }

  getBucketName(): string {
    return this.bucket;
  }

  buildObjectKey(tenantId: string, documentId: string, fileName: string): string {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `tenants/${tenantId}/documents/${documentId}/${safeName}`;
  }

  private resolvePath(objectKey: string): string {
    return path.join(this.baseDir, objectKey);
  }

  async getUploadSignedUrl(
    objectKey: string,
    _contentType: string,
    expiresInSeconds: number,
  ): Promise<SignedUrlResult> {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const token = Buffer.from(`${objectKey}:${expiresAt.getTime()}`).toString('base64url');
    const uploadUrl = `${this.apiUrl}/storage/local-upload?token=${token}`;
    return { uploadUrl, expiresAt };
  }

  async getDownloadSignedUrl(
    objectKey: string,
    expiresInSeconds: number,
  ): Promise<SignedUrlResult> {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const token = Buffer.from(`${objectKey}:${expiresAt.getTime()}`).toString('base64url');
    const downloadUrl = `${this.apiUrl}/storage/local-download?token=${token}`;
    return { uploadUrl: downloadUrl, downloadUrl, expiresAt };
  }

  async getObjectMetadata(objectKey: string): Promise<ObjectMetadata> {
    const filePath = this.resolvePath(objectKey);
    try {
      const stat = await fs.stat(filePath);
      return {
        exists: true,
        sizeBytes: stat.size,
        contentType: 'application/octet-stream',
      };
    } catch {
      return { exists: false, sizeBytes: 0, contentType: '' };
    }
  }

  async deleteObject(objectKey: string): Promise<void> {
    await fs.rm(this.resolvePath(objectKey), { force: true });
  }

  async writeObject(objectKey: string, buffer: Buffer): Promise<void> {
    const filePath = this.resolvePath(objectKey);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
  }

  async readObject(objectKey: string): Promise<Buffer> {
    return fs.readFile(this.resolvePath(objectKey));
  }

  decodeToken(token: string): { objectKey: string; expiresAt: number } | null {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      const lastColon = decoded.lastIndexOf(':');
      const objectKey = decoded.slice(0, lastColon);
      const expiresAt = Number(decoded.slice(lastColon + 1));
      if (!objectKey || Number.isNaN(expiresAt)) return null;
      return { objectKey, expiresAt };
    } catch {
      return null;
    }
  }
}
