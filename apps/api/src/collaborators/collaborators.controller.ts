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

import { CollaboratorsService } from './collaborators.service';

import { CreateCollaboratorDto } from './dto/create-collaborator.dto';

import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';



@Controller('collaborators')

@UseGuards(JwtAuthGuard, RolesGuard)

export class CollaboratorsController {

  constructor(private readonly collaboratorsService: CollaboratorsService) {}



  @Get()

  list(

    @CurrentUser() user: JwtPayload,

    @Query('q') q?: string,

    @Query('teamId') teamId?: string,

    @Query('active') active?: string,

    @Query('page') page?: string,

    @Query('limit') limit?: string,

  ) {

    return this.collaboratorsService.list(

      user,

      q,

      teamId,

      active === 'true' ? true : active === 'false' ? false : undefined,

      page ? Number(page) : 1,

      limit ? Number(limit) : 20,

    );

  }



  @Get(':id')

  findOne(

    @CurrentUser() user: JwtPayload,

    @Param('id', ParseUUIDPipe) id: string,

  ) {

    return this.collaboratorsService.findOne(user, id);

  }



  @Post()

  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)

  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCollaboratorDto) {

    return this.collaboratorsService.create(user, dto);

  }



  @Patch(':id')

  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)

  update(

    @CurrentUser() user: JwtPayload,

    @Param('id', ParseUUIDPipe) id: string,

    @Body() dto: UpdateCollaboratorDto,

  ) {

    return this.collaboratorsService.update(user, id, dto);

  }



  @Delete(':id')

  @Roles(TenantRole.owner, TenantRole.admin, TenantRole.member)

  remove(

    @CurrentUser() user: JwtPayload,

    @Param('id', ParseUUIDPipe) id: string,

  ) {

    return this.collaboratorsService.remove(user, id);

  }

}


