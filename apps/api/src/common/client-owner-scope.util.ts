import { Prisma } from '@prisma/client';
import { JwtPayload } from '../auth/auth.types';

/** Escopo de clientes visíveis ao usuário autenticado. */
export function clientOwnerScope(user: JwtPayload): Prisma.ClientWhereInput {
  if (user.isSuperAdmin) return {};
  return { OR: [{ ownerId: user.sub }, { isDefault: true }] };
}
