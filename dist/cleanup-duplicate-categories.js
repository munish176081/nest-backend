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
let BreedCleanup = class BreedCleanup {
};
__decorate([
    (0, typeorm_2.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BreedCleanup.prototype, "id", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 255, unique: true }),
    __metadata("design:type", String)
], BreedCleanup.prototype, "name", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 255, unique: true }),
    __metadata("design:type", String)
], BreedCleanup.prototype, "slug", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], BreedCleanup.prototype, "description", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], BreedCleanup.prototype, "category", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], BreedCleanup.prototype, "size", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], BreedCleanup.prototype, "temperament", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 50, nullable: true, name: 'life_expectancy' }),
    __metadata("design:type", String)
], BreedCleanup.prototype, "lifeExpectancy", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'boolean', default: true, name: 'is_active' }),
    __metadata("design:type", Boolean)
], BreedCleanup.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'int', default: 0, name: 'sort_order' }),
    __metadata("design:type", Number)
], BreedCleanup.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 500, nullable: true, name: 'image_url' }),
    __metadata("design:type", String)
], BreedCleanup.prototype, "imageUrl", void 0);
__decorate([
    (0, typeorm_2.CreateDateColumn)({ type: 'timestamptz', name: 'created_at' }),
    __metadata("design:type", Date)
], BreedCleanup.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_2.UpdateDateColumn)({ type: 'timestamptz', name: 'updated_at' }),
    __metadata("design:type", Date)
], BreedCleanup.prototype, "updatedAt", void 0);
BreedCleanup = __decorate([
    (0, typeorm_2.Entity)({ name: 'breeds' }),
    (0, typeorm_2.Index)(['name']),
    (0, typeorm_2.Index)(['slug']),
    (0, typeorm_2.Index)(['category']),
    (0, typeorm_2.Index)(['isActive']),
    (0, typeorm_2.Index)(['sortOrder'])
], BreedCleanup);
const dataSource = new typeorm_1.DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/pups4sale',
    entities: [BreedCleanup],
    synchronize: false,
    logging: true,
});
async function cleanupDuplicateCategories() {
    try {
        await dataSource.initialize();
        console.log('Database connection established');
        const breedRepository = dataSource.getRepository(BreedCleanup);
        const breeds = await breedRepository.find({
            where: { category: (0, typeorm_1.Not)(null) },
            select: ['id', 'category']
        });
        console.log(`Found ${breeds.length} breeds with categories`);
        const categoryGroups = new Map();
        breeds.forEach(breed => {
            if (breed.category) {
                const lowerCategory = breed.category.toLowerCase();
                if (!categoryGroups.has(lowerCategory)) {
                    categoryGroups.set(lowerCategory, []);
                }
                categoryGroups.get(lowerCategory).push(breed.id);
            }
        });
        console.log('Category groups:');
        categoryGroups.forEach((ids, category) => {
            console.log(`  ${category}: ${ids.length} entries`);
        });
        const duplicates = Array.from(categoryGroups.entries()).filter(([category, ids]) => ids.length > 1);
        if (duplicates.length === 0) {
            console.log('No duplicate categories found!');
            return;
        }
        console.log(`Found ${duplicates.length} categories with duplicates:`);
        for (const [category, ids] of duplicates) {
            console.log(`\nProcessing category: ${category}`);
            console.log(`  Found ${ids.length} entries: ${ids.join(', ')}`);
            const [keepId, ...updateIds] = ids;
            console.log(`  Keeping: ${keepId}`);
            console.log(`  Updating: ${updateIds.join(', ')}`);
            const keepBreed = await breedRepository.findOne({ where: { id: keepId } });
            if (keepBreed && keepBreed.category !== category) {
                await breedRepository.update(keepId, { category: category });
                console.log(`  Updated ${keepId} to lowercase`);
            }
            for (const id of updateIds) {
                await breedRepository.update(id, { category: category });
                console.log(`  Updated ${id} to lowercase`);
            }
        }
        console.log('\nCleanup completed successfully!');
    }
    catch (error) {
        console.error('Cleanup failed:', error);
    }
    finally {
        if (dataSource.isInitialized) {
            await dataSource.destroy();
            console.log('Database connection closed');
        }
    }
}
cleanupDuplicateCategories();
//# sourceMappingURL=cleanup-duplicate-categories.js.map