import {

  Body,

  Controller,

  Delete,

  Get,

  Param,

  ParseUUIDPipe,

  Patch,

  Post,

  Query,

  UseGuards,

} from '@nestjs/common';

import { TenantRole } from '@prisma/client';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { Roles, RolesGuard } from '../common/guards/roles.guard';

import { JwtPayload } from '../auth/auth.types';

import { ClientsService } from './clients.service';

import { CreateClientDto } from './dto/create-client.dto';

import { UpdateClientDto } from './dto/update-client.dto';
import { MergeClientsDto } from './dto/merge-clients.dto';



@Controller('clients')

@UseGuards(JwtAuthGuard, RolesGuard)

export class ClientsController {

  constructor(private readonly clientsService: ClientsService) {}



  @Get()

  list(

    @CurrentUser() user: JwtPayload,

    @Query('q') q?: string,

    @Query('page') page?: string,

    @Query('limit') limit?: string,

    @Query('animalType') animalType?: string,

    @Query('animalSex') animalSex?: string,

    @Query('livestockCategory') livestockCategory?: string,

    @Query('intentionId') intentionId?: string,

  ) {

    return this.clientsService.list(

      user,

      q,

      page ? Number(page) : 1,

      limit ? Number(limit) : 20,

      { animalType, animalSex, livestockCategory, intentionId },

    );

  }



  @Get(':id')

  findOne(

    @CurrentUser() user: JwtPayload,

    @Param('id', ParseUUIDPipe) id: string,

  ) {

    return this.clientsService.findOne(user, id);

  }



  @Post()

  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)

  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateClientDto) {

    return this.clientsService.create(user, dto);

  }



  @Post('merge')

  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)

  merge(@CurrentUser() user: JwtPayload, @Body() dto: MergeClientsDto) {

    return this.clientsService.merge(user, dto);

  }



  @Patch(':id')

  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)

  update(

    @CurrentUser() user: JwtPayload,

    @Param('id', ParseUUIDPipe) id: string,

    @Body() dto: UpdateClientDto,

  ) {

    return this.clientsService.update(user, id, dto);

  }



  @Delete(':id')

  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)

  remove(

    @CurrentUser() user: JwtPayload,

    @Param('id', ParseUUIDPipe) id: string,

  ) {

    return this.clientsService.remove(user, id);

  }

}


