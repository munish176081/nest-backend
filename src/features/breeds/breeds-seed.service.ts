import { Injectable } from '@nestjs/common';
import { BreedsService } from './breeds.service';
import { breedsSeedData } from './breeds.seed';
import { CreateBreedDto } from './dto/create-breed.dto';

@Injectable()
export class BreedsSeedService {
  constructor(private readonly breedsService: BreedsService) {}

  async seedBreeds() {
    console.log('Starting breeds seeding...');
    
    const existingBreeds = await this.breedsService.findActiveBreeds();
    
    if (existingBreeds.length > 0) {
      console.log(`Found ${existingBreeds.length} existing breeds. Skipping seeding.`);
      return;
    }

    const createdBreeds = [];
    
    for (const breedData of breedsSeedData) {
      try {
        const breed = await this.breedsService.create(breedData as CreateBreedDto);
        createdBreeds.push(breed);
        console.log(`Created breed: ${breed.name}`);
      } catch (error) {
        console.error(`Failed to create breed ${breedData.name}:`, error.message);
      }
    }

    console.log(`Successfully seeded ${createdBreeds.length} breeds.`);
    return createdBreeds;
  }

  async clearBreeds() {
    console.log('Clearing all breeds...');
    // This would need to be implemented in the repository
    // For now, we'll just log it
    console.log('Clear breeds functionality not implemented yet.');
  }
} 