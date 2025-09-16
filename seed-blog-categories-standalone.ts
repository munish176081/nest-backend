import { DataSource } from 'typeorm';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// Temporary BlogCategory entity for seeding (without relationships)
@Entity({ name: 'blog_categories' })
@Index(['name'])
@Index(['slug'])
@Index(['isActive'])
class BlogCategorySeed {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string;

  @Column({ type: 'int', default: 0, name: 'post_count' })
  postCount: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}

const categories = [
  {
    name: 'Travel & Adventure',
    slug: 'travel-adventure',
    description: 'Adventure stories and travel tips for dogs and their owners',
    color: '#3B82F6',
  },
  {
    name: 'Health & Nutrition',
    slug: 'health-nutrition',
    description: 'Health tips, nutrition guides, and veterinary advice',
    color: '#10B981',
  },
  {
    name: 'Grooming & Care',
    slug: 'grooming-care',
    description: 'Grooming tips, care routines, and maintenance guides',
    color: '#F59E0B',
  },
  {
    name: 'Adoption Stories',
    slug: 'adoption-stories',
    description: 'Heartwarming adoption stories and rescue experiences',
    color: '#EF4444',
  },
  {
    name: 'Training & Behavior',
    slug: 'training-behavior',
    description: 'Training techniques and behavior modification tips',
    color: '#8B5CF6',
  },
];

// Database configuration
const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://localhost:5432/pups4sale',
  entities: [BlogCategorySeed],
  synchronize: false, // Don't auto-sync for seeding
  logging: true,
});

async function seedBlogCategories() {
  try {
    // Initialize the data source
    await dataSource.initialize();
    console.log('Database connection established');

    // Get the category repository
    const categoryRepository = dataSource.getRepository(BlogCategorySeed);

    console.log('🌱 Seeding blog categories...');

    // Create categories
    const createdCategories = [];
    
    for (const categoryData of categories) {
      try {
        // Check if category already exists
        const existingCategory = await categoryRepository.findOne({
          where: { slug: categoryData.slug },
        });

        if (existingCategory) {
          console.log(`⏭️  Category already exists: ${categoryData.name}`);
          continue;
        }

        const category = categoryRepository.create(categoryData);
        const savedCategory = await categoryRepository.save(category);
        createdCategories.push(savedCategory);
        console.log(`✅ Created category: ${savedCategory.name}`);
      } catch (error) {
        console.error(`Failed to create category ${categoryData.name}:`, error.message);
      }
    }

    console.log(`🎉 Successfully seeded ${createdCategories.length} blog categories.`);
    
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
seedBlogCategories();
