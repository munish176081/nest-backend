const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { BreedsSeedService } = require('./dist/features/breeds/breeds-seed.service');

async function seedBreeds() {
  try {
    console.log('Starting breeds seeding process...');
    
    const app = await NestFactory.createApplicationContext(AppModule);
    const breedsSeedService = app.get(BreedsSeedService);
    
    await breedsSeedService.seedBreeds();
    
    console.log('Breeds seeding completed successfully!');
    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding breeds:', error);
    process.exit(1);
  }
}

seedBreeds(); 