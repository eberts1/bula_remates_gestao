import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { JwtPayload } from '../auth/auth.types';
import { AuditService } from './audit.service';

const SKIP_PREFIXES = ['/health', '/auth/refresh'];

function deriveAction(method: string, path: string): string {
  const normalized = path.replace(/^\/+/, '').split('?')[0] ?? '';
  const parts = normalized.split('/').filter(Boolean);
  const resource = parts[0] ?? 'unknown';
  const verb =
    method === 'POST'
      ? 'create'
      : method === 'PATCH' || method === 'PUT'
        ? 'update'
        : method === 'DELETE'
          ? 'delete'
          : method.toLowerCase();
  return `${resource}.${verb}`;
}

function extractIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim();
  return req.ip;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<
      Request & { user?: JwtPayload }
    >();
    const method = req.method.toUpperCase();

    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const path = req.originalUrl ?? req.url ?? '';
    if (SKIP_PREFIXES.some((p) => path.startsWith(p))) {
      return next.handle();
    }

    const user = req.user;
    const action = deriveAction(method, path);

    return next.handle().pipe(
      tap({
        next: () => {
          void this.audit.log({
            tenantId: user?.tenantId ?? null,
            userId: user?.sub ?? null,
            actorEmail: user?.email ?? null,
            action,
            entityType: path.split('/').filter(Boolean)[0] ?? null,
            summary: `${method} ${path}`,
            metadata: { method, path, status: 'success' },
            ip: extractIp(req),
            userAgent: req.headers['user-agent'] ?? null,
          });
        },
        error: (err: { status?: number; message?: string }) => {
          void this.audit.log({
            tenantId: user?.tenantId ?? null,
            userId: user?.sub ?? null,
            actorEmail: user?.email ?? null,
            action: `${action}.failed`,
            entityType: path.split('/').filter(Boolean)[0] ?? null,
            summary: `${method} ${path} falhou`,
            metadata: {
              method,
              path,
              status: 'error',
              errorStatus: err?.status,
              errorMessage: err?.message,
            },
            ip: extractIp(req),
            userAgent: req.headers['user-agent'] ?? null,
          });
        },
      }),
    );
  }
}
