import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BreedsSeedService } from './features/breeds/breeds-seed.service';
import { seedBlogCategories } from './features/blogs/seed-blog-categories';
import { DataSource } from 'typeorm';

async function seedBreeds() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const breedsSeedService = app.get(BreedsSeedService);
    await breedsSeedService.seedBreeds();
    
    // Seed blog categories
    const dataSource = app.get(DataSource);
    await seedBlogCategories(dataSource);
    
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await app.close();
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedBreeds();
}

export { seedBreeds }; 