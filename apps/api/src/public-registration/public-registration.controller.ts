import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { PublicFormSubmitDto } from '../public-client-forms/dto/public-form-submit.dto';
import { PublicFormUploadDto } from '../public-client-forms/dto/public-form-upload.dto';
import { PublicRegistrationService } from './public-registration.service';

@Controller('public/register')
export class PublicRegistrationController {
  constructor(private readonly service: PublicRegistrationService) {}

  @Get(':tenantSlug')
  @SkipThrottle()
  getPage(@Param('tenantSlug') tenantSlug: string) {
    return this.service.getTenantBySlug(tenantSlug);
  }

  @Post(':tenantSlug')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  submit(
    @Param('tenantSlug') tenantSlug: string,
    @Body() dto: PublicFormSubmitDto,
  ) {
    return this.service.submit(tenantSlug, dto);
  }

  @Post(':tenantSlug/documents/upload-url')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  uploadUrl(
    @Param('tenantSlug') tenantSlug: string,
    @Body() dto: PublicFormUploadDto,
  ) {
    return this.service.createUploadUrl(tenantSlug, dto);
  }

  @Post(':tenantSlug/documents/:id/complete')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  complete(
    @Param('tenantSlug') tenantSlug: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.completeUpload(tenantSlug, id);
  }
}
