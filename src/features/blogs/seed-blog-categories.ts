import { DataSource } from 'typeorm';
import { BlogCategory } from './entities/blog-category.entity';

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

export async function seedBlogCategories(dataSource: DataSource) {
  const categoryRepository = dataSource.getRepository(BlogCategory);

  console.log('🌱 Seeding blog categories...');

  for (const categoryData of categories) {
    const existingCategory = await categoryRepository.findOne({
      where: { slug: categoryData.slug },
    });

    if (!existingCategory) {
      const category = categoryRepository.create(categoryData);
      await categoryRepository.save(category);
      console.log(`✅ Created category: ${categoryData.name}`);
    } else {
      console.log(`⏭️  Category already exists: ${categoryData.name}`);
    }
  }

  console.log('🎉 Blog categories seeding completed!');
}
