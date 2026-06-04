export interface SignedUrlResult {
  uploadUrl: string;
  downloadUrl?: string;
  expiresAt: Date;
}

export interface ObjectMetadata {
  sizeBytes: number;
  contentType: string;
  exists: boolean;
}

export abstract class StorageService {
  abstract getBucketName(): string;
  abstract buildObjectKey(tenantId: string, documentId: string, fileName: string): string;
  abstract getUploadSignedUrl(
    objectKey: string,
    contentType: string,
    expiresInSeconds: number,
  ): Promise<SignedUrlResult>;
  abstract getDownloadSignedUrl(
    objectKey: string,
    expiresInSeconds: number,
  ): Promise<SignedUrlResult>;
  abstract getObjectMetadata(objectKey: string): Promise<ObjectMetadata>;
  abstract deleteObject(objectKey: string): Promise<void>;
}
