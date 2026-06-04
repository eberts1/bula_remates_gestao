import {
  BadRequestException,
  Controller,
  Get,
  GoneException,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LocalStorageService } from './local-storage.service';

@Controller('storage')
export class LocalStorageController {
  constructor(private readonly localStorage: LocalStorageService) {}

  @Put('local-upload')
  @Post('local-upload')
  async localUpload(
    @Query('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const payload = this.validateToken(token);
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
    await this.localStorage.writeObject(payload.objectKey, Buffer.concat(chunks));
    res.status(200).json({ ok: true });
  }

  @Get('local-download')
  async localDownload(@Query('token') token: string, @Res() res: Response) {
    const payload = this.validateToken(token);
    const buffer = await this.localStorage.readObject(payload.objectKey);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(buffer);
  }

  private validateToken(token: string) {
    if (!token) throw new BadRequestException('Token obrigatório');
    const payload = this.localStorage.decodeToken(token);
    if (!payload) throw new BadRequestException('Token inválido');
    if (Date.now() > payload.expiresAt) throw new GoneException('URL expirada');
    return payload;
  }
}
