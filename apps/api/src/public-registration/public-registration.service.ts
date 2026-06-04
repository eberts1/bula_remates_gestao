import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantRole } from '@prisma/client';
import { ClientsService } from '../clients/clients.service';
import { DocumentsService } from '../documents/documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicFormSubmitDto } from '../public-client-forms/dto/public-form-submit.dto';
import { PublicFormUploadDto } from '../public-client-forms/dto/public-form-upload.dto';

@Injectable()
export class PublicRegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientsService: ClientsService,
    private readonly documentsService: DocumentsService,
  ) {}

  async getTenantBySlug(tenantSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, name: true, slug: true },
    });
    if (!tenant) {
      throw new NotFoundException('Página de cadastro não encontrada');
    }
    return {
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
    };
  }

  async submit(tenantSlug: string, dto: PublicFormSubmitDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (!tenant) {
      throw new NotFoundException('Página de cadastro não encontrada');
    }

    const client = await this.prisma.$transaction(async (tx) => {
      const created = await tx.client.create({
        data: {
          tenantId: tenant.id,
          name: dto.name,
          document: dto.document.trim(),
          email: dto.email || null,
          phone: dto.phone ?? null,
          addressFull: dto.addressFull,
          active: true,
        },
      });

      await this.clientsService.syncProperties(
        tx,
        tenant.id,
        created.id,
        dto.properties,
      );

      return created;
    });

    return {
      clientId: client.id,
      message: 'Cadastro enviado com sucesso',
    };
  }

  async createUploadUrl(tenantSlug: string, dto: PublicFormUploadDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (!tenant) {
      throw new NotFoundException('Página de cadastro não encontrada');
    }

    await this.clientsService.assertClientBelongsToTenant(tenant.id, dto.clientId);
    const createdById = await this.resolveUploadAuthor(tenant.id);

    return this.documentsService.createUploadUrlForPublicForm(
      tenant.id,
      createdById,
      dto,
    );
  }

  async completeUpload(tenantSlug: string, documentId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (!tenant) {
      throw new NotFoundException('Página de cadastro não encontrada');
    }

    return this.documentsService.completeUploadForPublicForm(
      tenant.id,
      documentId,
    );
  }

  private async resolveUploadAuthor(tenantId: string): Promise<string> {
    const owner = await this.prisma.tenantMember.findFirst({
      where: { tenantId, role: TenantRole.owner },
      select: { userId: true },
    });
    if (owner) return owner.userId;

    const anyMember = await this.prisma.tenantMember.findFirst({
      where: { tenantId },
      select: { userId: true },
    });
    if (!anyMember) {
      throw new NotFoundException('Empresa sem usuários configurados');
    }
    return anyMember.userId;
  }
}
