import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { ListingsRepository } from './listings.repository';
import { Listing } from './entities/listing.entity';
import { AuthModule } from '../authentication/authentication.module';
import { UsersModule } from '../accounts/users.module';
import { BreedsModule } from '../breeds/breeds.module';
import { LoggedInGuard } from '../../middleware/LoggedInGuard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Listing]),
    AuthModule,
    forwardRef(() => UsersModule),
    BreedsModule,
  ],
  controllers: [ListingsController],
  providers: [ListingsService, ListingsRepository, LoggedInGuard],
  exports: [ListingsService, ListingsRepository],
})
export class ListingsModule {} 