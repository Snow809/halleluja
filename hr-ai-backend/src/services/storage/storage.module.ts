import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { S3Service } from './s3.service';

@Module({
  providers: [StorageService, S3Service],
  exports: [StorageService, S3Service],
})
export class StorageModule {}
