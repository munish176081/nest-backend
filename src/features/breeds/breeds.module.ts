import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BreedsService } from './breeds.service';
import { BreedsController } from './breeds.controller';
import { BreedsSeedService } from './breeds-seed.service';
import { Breed } from './entities/breed.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Breed])],
  controllers: [BreedsController],
  providers: [BreedsService, BreedsSeedService],
  exports: [BreedsService, BreedsSeedService],
})
export class BreedsModule {} 