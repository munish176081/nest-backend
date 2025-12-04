"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const typeorm_2 = require("typeorm");
let BlogCategorySeed = class BlogCategorySeed {
};
__decorate([
    (0, typeorm_2.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BlogCategorySeed.prototype, "id", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 255, unique: true }),
    __metadata("design:type", String)
], BlogCategorySeed.prototype, "name", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 255, unique: true }),
    __metadata("design:type", String)
], BlogCategorySeed.prototype, "slug", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], BlogCategorySeed.prototype, "description", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 7, nullable: true }),
    __metadata("design:type", String)
], BlogCategorySeed.prototype, "color", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'int', default: 0, name: 'post_count' }),
    __metadata("design:type", Number)
], BlogCategorySeed.prototype, "postCount", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'boolean', default: true, name: 'is_active' }),
    __metadata("design:type", Boolean)
], BlogCategorySeed.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_2.CreateDateColumn)({ type: 'timestamptz', name: 'created_at' }),
    __metadata("design:type", Date)
], BlogCategorySeed.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_2.UpdateDateColumn)({ type: 'timestamptz', name: 'updated_at' }),
    __metadata("design:type", Date)
], BlogCategorySeed.prototype, "updatedAt", void 0);
BlogCategorySeed = __decorate([
    (0, typeorm_2.Entity)({ name: 'blog_categories' }),
    (0, typeorm_2.Index)(['name']),
    (0, typeorm_2.Index)(['slug']),
    (0, typeorm_2.Index)(['isActive'])
], BlogCategorySeed);
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
const dataSource = new typeorm_1.DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/pups4sale',
    entities: [BlogCategorySeed],
    synchronize: false,
    logging: true,
});
async function seedBlogCategories() {
    try {
        await dataSource.initialize();
        console.log('Database connection established');
        const categoryRepository = dataSource.getRepository(BlogCategorySeed);
        console.log('🌱 Seeding blog categories...');
        const createdCategories = [];
        for (const categoryData of categories) {
            try {
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
            }
            catch (error) {
                console.error(`Failed to create category ${categoryData.name}:`, error.message);
            }
        }
        console.log(`🎉 Successfully seeded ${createdCategories.length} blog categories.`);
    }
    catch (error) {
        console.error('Seeding failed:', error);
    }
    finally {
        if (dataSource.isInitialized) {
            await dataSource.destroy();
            console.log('Database connection closed');
        }
    }
}
seedBlogCategories();
//# sourceMappingURL=seed-blog-categories-standalone.js.map