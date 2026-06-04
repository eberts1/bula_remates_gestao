import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GcsStorageService } from './gcs-storage.service';
import { LocalStorageController } from './local-storage.controller';
import { LocalStorageService } from './local-storage.service';
import { StorageService } from './storage.interface';

@Module({
  controllers: [LocalStorageController],
  providers: [
    LocalStorageService,
    {
      provide: StorageService,
      inject: [ConfigService, LocalStorageService],
      useFactory: (config: ConfigService, local: LocalStorageService) => {
        const mode = config.get<string>('STORAGE_MODE', 'local');
        return mode === 'gcs' ? new GcsStorageService(config) : local;
      },
    },
  ],
  exports: [StorageService, LocalStorageService],
})
export class StorageModule {}
