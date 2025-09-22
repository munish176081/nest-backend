import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { R2Service } from './r2.service';
import { UploadRepository } from './upload.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Upload } from './entities/upload.entity';
import { AuthModule } from '../authentication/authentication.module';
import { UsersModule } from '../accounts/users.module';
import { LoggedInGuard } from '../../middleware/LoggedInGuard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Upload]),
    AuthModule,
    UsersModule,
  ],
  controllers: [UploadController],
  providers: [
    UploadService,
    R2Service,
    UploadRepository,
    LoggedInGuard,
  ],
  exports: [UploadService],
})
export class UploadModule {} 