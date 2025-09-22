import { DataSource, Not } from 'typeorm';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// Temporary Breed entity for cleanup
@Entity({ name: 'breeds' })
@Index(['name'])
@Index(['slug'])
@Index(['category'])
@Index(['isActive'])
@Index(['sortOrder'])
class BreedCleanup {
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

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'image_url' })
  imageUrl: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}

// Database configuration
const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://localhost:5432/pups4sale',
  entities: [BreedCleanup],
  synchronize: false,
  logging: true,
});

async function cleanupDuplicateCategories() {
  try {
    // Initialize the data source
    await dataSource.initialize();
    console.log('Database connection established');

    // Get the breed repository
    const breedRepository = dataSource.getRepository(BreedCleanup);

    // Find all breeds with categories
    const breeds = await breedRepository.find({
      where: { category: Not(null) },
      select: ['id', 'category']
    });

    console.log(`Found ${breeds.length} breeds with categories`);

    // Group by lowercase category
    const categoryGroups = new Map<string, string[]>();
    
    breeds.forEach(breed => {
      if (breed.category) {
        const lowerCategory = breed.category.toLowerCase();
        if (!categoryGroups.has(lowerCategory)) {
          categoryGroups.set(lowerCategory, []);
        }
        categoryGroups.get(lowerCategory)!.push(breed.id);
      }
    });

    console.log('Category groups:');
    categoryGroups.forEach((ids, category) => {
      console.log(`  ${category}: ${ids.length} entries`);
    });

    // Find categories with multiple entries (case-insensitive duplicates)
    const duplicates = Array.from(categoryGroups.entries()).filter(([category, ids]) => ids.length > 1);
    
    if (duplicates.length === 0) {
      console.log('No duplicate categories found!');
      return;
    }

    console.log(`Found ${duplicates.length} categories with duplicates:`);
    
    for (const [category, ids] of duplicates) {
      console.log(`\nProcessing category: ${category}`);
      console.log(`  Found ${ids.length} entries: ${ids.join(', ')}`);
      
      // Keep the first entry, update others to lowercase
      const [keepId, ...updateIds] = ids;
      
      console.log(`  Keeping: ${keepId}`);
      console.log(`  Updating: ${updateIds.join(', ')}`);
      
      // Update the first entry to lowercase if needed
      const keepBreed = await breedRepository.findOne({ where: { id: keepId } });
      if (keepBreed && keepBreed.category !== category) {
        await breedRepository.update(keepId, { category: category });
        console.log(`  Updated ${keepId} to lowercase`);
      }
      
      // Update other entries to lowercase
      for (const id of updateIds) {
        await breedRepository.update(id, { category: category });
        console.log(`  Updated ${id} to lowercase`);
      }
    }

    console.log('\nCleanup completed successfully!');
    
  } catch (error) {
    console.error('Cleanup failed:', error);
  } finally {
    // Close the connection
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('Database connection closed');
    }
  }
}

// Run the cleanup
cleanupDuplicateCategories();
