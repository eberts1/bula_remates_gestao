import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantRole } from '@prisma/client';
import { JwtPayload } from '../../auth/auth.types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: TenantRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<TenantRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    if (!required.includes(user.role)) {
      throw new ForbiddenException('Permissão insuficiente');
    }
    return true;
  }
}
