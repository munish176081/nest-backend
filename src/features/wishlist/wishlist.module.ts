import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { WishlistService } from './wishlist.service';
import { WishlistController } from './wishlist.controller';
import { ListingsModule } from '../listings/listings.module';
import { AuthModule } from '../authentication/authentication.module';
import { UsersModule } from '../accounts/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wishlist]),
    ListingsModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
