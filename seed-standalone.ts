import { DataSource } from 'typeorm';
import { breedsSeedData } from './src/features/breeds/breeds.seed';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// Temporary Breed entity for seeding (without relationships)
@Entity({ name: 'breeds' })
@Index(['name'])
@Index(['slug'])
@Index(['category'])
@Index(['isActive'])
@Index(['sortOrder'])
class BreedSeed {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  size: string;

  @Column({ type: 'text', nullable: true })
  temperament: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'life_expectancy' })
  lifeExpectancy: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}

// Database configuration
const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.dbUrl || 'postgresql://localhost:5432/pups4sale',
  entities: [BreedSeed],
  synchronize: false, // Don't auto-sync for seeding
  logging: true,
});

async function seedBreeds() {
  try {
    // Initialize the data source
    await dataSource.initialize();
    console.log('Database connection established');

    // Get the breed repository
    const breedRepository = dataSource.getRepository(BreedSeed);

    // Check if breeds already exist
    const existingBreeds = await breedRepository.find({
      where: { isActive: true }
    });

    if (existingBreeds.length > 0) {
      console.log(`Found ${existingBreeds.length} existing breeds. Skipping seeding.`);
      return;
    }

    // Create breeds
    const createdBreeds = [];
    
    for (const breedData of breedsSeedData) {
      try {
        const breed = breedRepository.create(breedData);
        const savedBreed = await breedRepository.save(breed);
        createdBreeds.push(savedBreed);
        console.log(`Created breed: ${savedBreed.name}`);
      } catch (error) {
        console.error(`Failed to create breed ${breedData.name}:`, error.message);
      }
    }

    console.log(`Successfully seeded ${createdBreeds.length} breeds.`);
    
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    // Close the connection
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('Database connection closed');
    }
  }
}

// Run the seeding
seedBreeds(); 