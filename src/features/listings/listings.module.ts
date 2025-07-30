import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { ListingsRepository } from './listings.repository';
import { Listing } from './entities/listing.entity';
import { AuthModule } from '../authentication/authentication.module';
import { UsersModule } from '../accounts/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Listing]),
    AuthModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [ListingsController],
  providers: [ListingsService, ListingsRepository],
  exports: [ListingsService, ListingsRepository],
})
export class ListingsModule {} 