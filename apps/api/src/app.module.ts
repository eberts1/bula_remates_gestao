import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';
import { TenantsModule } from './tenants/tenants.module';
import { ClientsModule } from './clients/clients.module';
import { TeamsModule } from './teams/teams.module';
import { CollaboratorsModule } from './collaborators/collaborators.module';
import { ClientFormTokensModule } from './client-form-tokens/client-form-tokens.module';
import { PublicClientFormsModule } from './public-client-forms/public-client-forms.module';
import { PublicRegistrationModule } from './public-registration/public-registration.module';
import { ClientImportsModule } from './client-imports/client-imports.module';
import { TenantIntentionsModule } from './tenant-intentions/tenant-intentions.module';
import { GeoModule } from './geo/geo.module';
import { ClientHygieneModule } from './client-hygiene/client-hygiene.module';
import { ClientAnalyticsModule } from './client-analytics/client-analytics.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AuctionsModule } from './auctions/auctions.module';
import { AuditModule } from './audit/audit.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { AdminModule } from './admin/admin.module';
import { RedisThrottlerStorage } from './common/redis-throttler.storage';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisThrottlerStorage],
      useFactory: (storage: RedisThrottlerStorage) => ({
        throttlers: [{ name: 'default', ttl: 60000, limit: 100 }],
        storage,
      }),
    }),
    PrismaModule,
    RedisModule,
    StorageModule,
    AuditModule,
    AuthModule,
    TenantsModule,
    ClientsModule,
    TeamsModule,
    CollaboratorsModule,
    DocumentsModule,
    ClientFormTokensModule,
    PublicClientFormsModule,
    PublicRegistrationModule,
    ClientImportsModule,
    TenantIntentionsModule,
    GeoModule,
    ClientHygieneModule,
    ClientAnalyticsModule,
    AttendanceModule,
    AuctionsModule,
    AdminModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
