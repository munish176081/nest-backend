import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BreedsService } from './breeds.service';
import { BreedsController } from './breeds.controller';
import { BreedsSeedService } from './breeds-seed.service';
import { BreedTypeImagesService } from './breed-type-images.service';
import { BreedTypeImagesController } from './breed-type-images.controller';
import { Breed } from './entities/breed.entity';
import { BreedTypeImage } from './entities/breed-type-image.entity';
import { AuthModule } from '../authentication/authentication.module';
import { UsersModule } from '../accounts/users.module';
import { LoggedInGuard } from '../../middleware/LoggedInGuard';
import { AdminGuard } from '../../middleware/AdminGuard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Breed, BreedTypeImage]),
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [BreedsController, BreedTypeImagesController],
  providers: [BreedsService, BreedsSeedService, BreedTypeImagesService, LoggedInGuard, AdminGuard],
  exports: [BreedsService, BreedsSeedService, BreedTypeImagesService],
})
export class BreedsModule {} 