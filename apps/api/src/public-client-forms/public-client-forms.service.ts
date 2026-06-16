import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientFormTokenType } from '@prisma/client';
import { hashFormToken } from '../common/token.util';
import { ClientsService } from '../clients/clients.service';
import { DocumentsService } from '../documents/documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicFormSubmitDto } from './dto/public-form-submit.dto';
import { PublicFormUploadDto } from './dto/public-form-upload.dto';

@Injectable()
export class PublicClientFormsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientsService: ClientsService,
    private readonly documentsService: DocumentsService,
  ) {}

  async getForm(rawToken: string) {
    const token = await this.resolveToken(rawToken, { allowSubmitted: true });

    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: token.tenantId },
      select: { name: true },
    });

    if (token.type === ClientFormTokenType.create) {
      return {
        type: token.type,
        tenantName: tenant.name,
        client: null,
        properties: [],
      };
    }

    const client = await this.prisma.client.findFirst({
      where: {
        id: token.clientId!,
        tenantId: token.tenantId,
        deletedAt: null,
      },
      include: { properties: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!client) throw new NotFoundException('Link inválido ou expirado');

    return {
      type: token.type,
      tenantName: tenant.name,
      client: {
        name: client.name,
        document: client.document ?? '',
        email: client.email ?? '',
        phone: client.phone ?? '',
        addressFull: client.addressFull ?? '',
      },
      properties: client.properties.map((p) => ({
        id: p.id,
        farmName: p.farmName,
        city: p.city,
        state: p.state,
        routeNotes: p.routeNotes ?? '',
        phone: p.phone ?? '',
        ie: p.ie ?? '',
        nirf: p.nirf ?? '',
      })),
    };
  }

  async submit(rawToken: string, dto: PublicFormSubmitDto) {
    const token = await this.resolveToken(rawToken);

    if (token.type === ClientFormTokenType.create) {
      const client = await this.prisma.$transaction(async (tx) => {
        const created = await tx.client.create({
          data: {
            tenantId: token.tenantId,
            ownerId: token.createdById,
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
          token.tenantId,
          created.id,
          dto.properties,
        );

        return created;
      });

      return {
        clientId: client.id,
        message: 'Cadastro criado com sucesso',
      };
    }

    if (token.usedAt) {
      throw new BadRequestException('Este link já foi utilizado');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id: token.clientId! },
        data: {
          name: dto.name,
          document: dto.document.trim(),
          email: dto.email || null,
          phone: dto.phone ?? null,
          addressFull: dto.addressFull,
        },
      });

      await this.clientsService.syncProperties(
        tx,
        token.tenantId,
        token.clientId!,
        dto.properties,
      );

      await tx.clientFormToken.update({
        where: { id: token.id },
        data: { submittedAt: new Date() },
      });
    });

    return {
      clientId: token.clientId!,
      message: 'Cadastro atualizado com sucesso',
    };
  }

  async createUploadUrl(rawToken: string, dto: PublicFormUploadDto) {
    const token = await this.resolveToken(rawToken, { allowSubmitted: true });

    if (token.type === ClientFormTokenType.edit) {
      if (dto.clientId !== token.clientId) {
        throw new BadRequestException('Cliente inválido para este link');
      }
      if (!token.submittedAt) {
        throw new BadRequestException('Envie o formulário antes de anexar arquivos');
      }
    } else {
      await this.clientsService.assertClientBelongsToTenant(
        token.tenantId,
        dto.clientId,
      );
    }

    return this.documentsService.createUploadUrlForPublicForm(
      token.tenantId,
      token.createdById,
      dto,
    );
  }

  async completeUpload(rawToken: string, documentId: string) {
    const token = await this.resolveToken(rawToken, { allowSubmitted: true });
    return this.documentsService.completeUploadForPublicForm(
      token.tenantId,
      documentId,
    );
  }

  async finalize(rawToken: string) {
    const token = await this.resolveToken(rawToken, { allowSubmitted: true });

    if (token.type !== ClientFormTokenType.edit) {
      throw new BadRequestException('Finalize disponível apenas para links de edição');
    }

    if (!token.submittedAt) {
      throw new BadRequestException('Envie o formulário antes de finalizar');
    }

    if (token.usedAt) {
      throw new BadRequestException('Este link já foi utilizado');
    }

    await this.prisma.clientFormToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    });

    return { ok: true };
  }

  private async resolveToken(
    rawToken: string,
    opts?: { allowSubmitted?: boolean },
  ) {
    const hash = hashFormToken(rawToken);
    const token = await this.prisma.clientFormToken.findUnique({
      where: { tokenHash: hash },
    });

    if (!token || token.revokedAt) {
      throw new NotFoundException('Link inválido ou expirado');
    }

    if (token.expiresAt < new Date()) {
      throw new NotFoundException('Link inválido ou expirado');
    }

    if (token.type === ClientFormTokenType.edit && token.usedAt) {
      throw new NotFoundException('Link inválido ou expirado');
    }

    if (
      token.type === ClientFormTokenType.edit &&
      !opts?.allowSubmitted &&
      token.submittedAt
    ) {
      throw new NotFoundException('Link inválido ou expirado');
    }

    return token;
  }
}
