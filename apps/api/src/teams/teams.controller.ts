import {

  Body,

  Controller,

  Delete,

  Get,

  Param,

  ParseUUIDPipe,

  Patch,

  Post,

  UseGuards,

} from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { SuperAdminGuard } from '../common/guards/super-admin.guard';

import { JwtPayload } from '../auth/auth.types';

import { CreateTeamDto } from './dto/create-team.dto';

import { UpdateTeamDto } from './dto/update-team.dto';

import { TeamsService } from './teams.service';



@Controller('teams')

@UseGuards(JwtAuthGuard, SuperAdminGuard)

export class TeamsController {

  constructor(private readonly teamsService: TeamsService) {}



  @Get()

  list(@CurrentUser() user: JwtPayload) {

    return this.teamsService.list(user);

  }



  @Get(':id')

  findOne(

    @CurrentUser() user: JwtPayload,

    @Param('id', ParseUUIDPipe) id: string,

  ) {

    return this.teamsService.findOne(user, id);

  }



  @Post()

  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTeamDto) {

    return this.teamsService.create(user, dto);

  }



  @Patch(':id')

  update(

    @CurrentUser() user: JwtPayload,

    @Param('id', ParseUUIDPipe) id: string,

    @Body() dto: UpdateTeamDto,

  ) {

    return this.teamsService.update(user, id, dto);

  }



  @Delete(':id')

  remove(

    @CurrentUser() user: JwtPayload,

    @Param('id', ParseUUIDPipe) id: string,

  ) {

    return this.teamsService.remove(user, id);

  }

}


