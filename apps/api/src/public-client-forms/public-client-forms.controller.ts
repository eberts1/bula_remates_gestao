import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PublicFormSubmitDto } from './dto/public-form-submit.dto';
import { PublicFormUploadDto } from './dto/public-form-upload.dto';
import { PublicClientFormsService } from './public-client-forms.service';

@Controller('public/client-forms')
export class PublicClientFormsController {
  constructor(private readonly service: PublicClientFormsService) {}

  @Get(':token')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  getForm(@Param('token') token: string) {
    return this.service.getForm(token);
  }

  @Post(':token')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  submit(@Param('token') token: string, @Body() dto: PublicFormSubmitDto) {
    return this.service.submit(token, dto);
  }

  @Post(':token/documents/upload-url')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  uploadUrl(@Param('token') token: string, @Body() dto: PublicFormUploadDto) {
    return this.service.createUploadUrl(token, dto);
  }

  @Post(':token/documents/:id/complete')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  complete(
    @Param('token') token: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.completeUpload(token, id);
  }

  @Post(':token/finalize')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  finalize(@Param('token') token: string) {
    return this.service.finalize(token);
  }
}
