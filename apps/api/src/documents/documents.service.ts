import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentStatus, TenantRole } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayload } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { StorageService } from '../storage/storage.interface';
import { UploadUrlDto } from './dto/upload-url.dto';

const UPLOAD_URL_TTL = 900;
const DOWNLOAD_URL_TTL = 900;

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
    private readonly clientsService: ClientsService,
  ) {}

  async createUploadUrlForPublicForm(
    tenantId: string,
    createdById: string,
    dto: {
      clientId: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
    },
  ) {
    if (!ALLOWED_MIME.has(dto.mimeType)) {
      throw new BadRequestException('Tipo de arquivo não permitido');
    }

    await this.assertQuota(tenantId, dto.sizeBytes);
    await this.clientsService.assertClientBelongsToTenant(tenantId, dto.clientId);

    const documentId = uuidv4();
    const objectKey = this.storage.buildObjectKey(
      tenantId,
      documentId,
      dto.fileName,
    );

    const document = await this.prisma.document.create({
      data: {
        id: documentId,
        tenantId,
        clientId: dto.clientId,
        createdById,
        name: dto.fileName,
        mimeType: dto.mimeType,
        gcsBucket: this.storage.getBucketName(),
        gcsObjectKey: objectKey,
        status: DocumentStatus.draft,
      },
    });

    const expiresAt = new Date(Date.now() + UPLOAD_URL_TTL * 1000);
    await this.prisma.uploadSession.create({
      data: {
        documentId: document.id,
        tenantId,
        expiresAt,
        expectedSize: BigInt(dto.sizeBytes),
        contentType: dto.mimeType,
      },
    });

    const signed = await this.storage.getUploadSignedUrl(
      objectKey,
      dto.mimeType,
      UPLOAD_URL_TTL,
    );

    return {
      documentId: document.id,
      uploadUrl: signed.uploadUrl,
      expiresAt: signed.expiresAt,
    };
  }

  async completeUploadForPublicForm(tenantId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        tenantId,
        status: DocumentStatus.draft,
        deletedAt: null,
      },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    const session = await this.prisma.uploadSession.findFirst({
      where: {
        documentId,
        tenantId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      throw new BadRequestException('Sessão de upload expirada ou inválida');
    }

    const metadata = await this.storage.getObjectMetadata(document.gcsObjectKey);
    if (!metadata.exists) {
      throw new BadRequestException('Arquivo ainda não foi enviado ao storage');
    }

    const sizeBytes = BigInt(metadata.sizeBytes);
    if (sizeBytes > session.expectedSize) {
      throw new BadRequestException('Arquivo excede o tamanho declarado');
    }

    await this.assertQuota(tenantId, Number(sizeBytes), documentId);

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.ready,
        sizeBytes,
        mimeType: metadata.contentType || document.mimeType,
      },
    });

    await this.prisma.uploadSession.deleteMany({ where: { documentId } });

    return this.serializeDocument(updated);
  }

  async createUploadUrl(user: JwtPayload, dto: UploadUrlDto) {
    this.assertCanUpload(user.role);
    if (!ALLOWED_MIME.has(dto.mimeType)) {
      throw new BadRequestException('Tipo de arquivo não permitido');
    }

    await this.assertQuota(user.tenantId, dto.sizeBytes);
    await this.clientsService.assertClientBelongsToTenant(
      user.tenantId,
      dto.clientId,
    );

    const documentId = uuidv4();
    const objectKey = this.storage.buildObjectKey(
      user.tenantId,
      documentId,
      dto.fileName,
    );

    const document = await this.prisma.document.create({
      data: {
        id: documentId,
        tenantId: user.tenantId,
        clientId: dto.clientId,
        createdById: user.sub,
        name: dto.fileName,
        mimeType: dto.mimeType,
        gcsBucket: this.storage.getBucketName(),
        gcsObjectKey: objectKey,
        status: DocumentStatus.draft,
      },
    });

    const expiresAt = new Date(Date.now() + UPLOAD_URL_TTL * 1000);
    await this.prisma.uploadSession.create({
      data: {
        documentId: document.id,
        tenantId: user.tenantId,
        expiresAt,
        expectedSize: BigInt(dto.sizeBytes),
        contentType: dto.mimeType,
      },
    });

    const signed = await this.storage.getUploadSignedUrl(
      objectKey,
      dto.mimeType,
      UPLOAD_URL_TTL,
    );

    return {
      documentId: document.id,
      uploadUrl: signed.uploadUrl,
      expiresAt: signed.expiresAt,
    };
  }

  async completeUpload(user: JwtPayload, documentId: string) {
    this.assertCanUpload(user.role);

    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        tenantId: user.tenantId,
        status: DocumentStatus.draft,
        deletedAt: null,
      },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }

    const session = await this.prisma.uploadSession.findFirst({
      where: {
        documentId,
        tenantId: user.tenantId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      throw new BadRequestException('Sessão de upload expirada ou inválida');
    }

    const metadata = await this.storage.getObjectMetadata(document.gcsObjectKey);
    if (!metadata.exists) {
      throw new BadRequestException('Arquivo ainda não foi enviado ao storage');
    }

    const sizeBytes = BigInt(metadata.sizeBytes);
    if (sizeBytes > session.expectedSize) {
      throw new BadRequestException('Arquivo excede o tamanho declarado');
    }

    await this.assertQuota(user.tenantId, Number(sizeBytes), documentId);

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.ready,
        sizeBytes,
        mimeType: metadata.contentType || document.mimeType,
      },
    });

    await this.prisma.uploadSession.deleteMany({ where: { documentId } });

    return this.serializeDocument(updated);
  }

  async getDownloadUrl(user: JwtPayload, documentId: string) {
    const document = await this.findReadyDocument(user.tenantId, documentId);
    const signed = await this.storage.getDownloadSignedUrl(
      document.gcsObjectKey,
      DOWNLOAD_URL_TTL,
    );
    return {
      downloadUrl: signed.downloadUrl ?? signed.uploadUrl,
      expiresAt: signed.expiresAt,
      fileName: document.name,
    };
  }

  async list(
    user: JwtPayload,
    page = 1,
    limit = 20,
    clientId?: string,
  ) {
    if (!clientId) {
      throw new BadRequestException('clientId é obrigatório');
    }
    await this.clientsService.assertClientBelongsToTenant(
      user.tenantId,
      clientId,
    );

    const skip = (page - 1) * limit;
    const where = {
      tenantId: user.tenantId,
      clientId,
      status: DocumentStatus.ready,
      deletedAt: null,
    };

    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      items: items.map((d) => this.serializeDocument(d)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async remove(user: JwtPayload, documentId: string) {
    this.assertCanDelete(user.role);

    const document = await this.findReadyDocument(user.tenantId, documentId);

    await this.prisma.document.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.deleted,
        deletedAt: new Date(),
      },
    });

    return { ok: true };
  }

  private async findReadyDocument(tenantId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        tenantId,
        status: DocumentStatus.ready,
        deletedAt: null,
      },
    });
    if (!document) {
      throw new NotFoundException('Documento não encontrado');
    }
    return document;
  }

  private async assertQuota(
    tenantId: string,
    additionalBytes: number,
    excludeDocumentId?: string,
  ) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
    });

    const used = await this.prisma.document.aggregate({
      where: {
        tenantId,
        status: DocumentStatus.ready,
        deletedAt: null,
        ...(excludeDocumentId ? { id: { not: excludeDocumentId } } : {}),
      },
      _sum: { sizeBytes: true },
    });

    const usedBytes = Number(used._sum.sizeBytes ?? 0n);
    const quota = Number(tenant.storageQuotaBytes);

    if (usedBytes + additionalBytes > quota) {
      throw new ForbiddenException('Quota de armazenamento excedida');
    }
  }

  private assertCanUpload(role: TenantRole) {
    if (role === 'viewer') {
      throw new ForbiddenException('Visualizadores não podem enviar arquivos');
    }
  }

  private assertCanDelete(role: TenantRole) {
    if (!['owner', 'admin', 'member'].includes(role)) {
      throw new ForbiddenException('Sem permissão para excluir');
    }
  }

  private serializeDocument(doc: {
    id: string;
    name: string;
    mimeType: string;
    sizeBytes: bigint | null;
    status: DocumentStatus;
    createdAt: Date;
    createdBy?: { id: string; name: string; email: string };
  }) {
    return {
      id: doc.id,
      name: doc.name,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes ? Number(doc.sizeBytes) : null,
      status: doc.status,
      createdAt: doc.createdAt.toISOString(),
      createdBy: doc.createdBy,
    };
  }
}
