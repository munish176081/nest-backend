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
const breeds_seed_1 = require("./src/features/breeds/breeds.seed");
const typeorm_2 = require("typeorm");
let BreedSeed = class BreedSeed {
};
__decorate([
    (0, typeorm_2.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], BreedSeed.prototype, "id", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 255, unique: true }),
    __metadata("design:type", String)
], BreedSeed.prototype, "name", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 255, unique: true }),
    __metadata("design:type", String)
], BreedSeed.prototype, "slug", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], BreedSeed.prototype, "description", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], BreedSeed.prototype, "category", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], BreedSeed.prototype, "size", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], BreedSeed.prototype, "temperament", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'varchar', length: 50, nullable: true, name: 'life_expectancy' }),
    __metadata("design:type", String)
], BreedSeed.prototype, "lifeExpectancy", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'boolean', default: true, name: 'is_active' }),
    __metadata("design:type", Boolean)
], BreedSeed.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_2.Column)({ type: 'int', default: 0, name: 'sort_order' }),
    __metadata("design:type", Number)
], BreedSeed.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_2.CreateDateColumn)({ type: 'timestamptz', name: 'created_at' }),
    __metadata("design:type", Date)
], BreedSeed.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_2.UpdateDateColumn)({ type: 'timestamptz', name: 'updated_at' }),
    __metadata("design:type", Date)
], BreedSeed.prototype, "updatedAt", void 0);
BreedSeed = __decorate([
    (0, typeorm_2.Entity)({ name: 'breeds' }),
    (0, typeorm_2.Index)(['name']),
    (0, typeorm_2.Index)(['slug']),
    (0, typeorm_2.Index)(['category']),
    (0, typeorm_2.Index)(['isActive']),
    (0, typeorm_2.Index)(['sortOrder'])
], BreedSeed);
const dataSource = new typeorm_1.DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/pups4sale',
    entities: [BreedSeed],
    synchronize: false,
    logging: true,
});
async function seedBreeds() {
    try {
        await dataSource.initialize();
        console.log('Database connection established');
        const breedRepository = dataSource.getRepository(BreedSeed);
        const existingBreeds = await breedRepository.find({
            where: { isActive: true }
        });
        if (existingBreeds.length > 0) {
            console.log(`Found ${existingBreeds.length} existing breeds. Skipping seeding.`);
            return;
        }
        const createdBreeds = [];
        for (const breedData of breeds_seed_1.breedsSeedData) {
            try {
                const breed = breedRepository.create(breedData);
                const savedBreed = await breedRepository.save(breed);
                createdBreeds.push(savedBreed);
                console.log(`Created breed: ${savedBreed.name}`);
            }
            catch (error) {
                console.error(`Failed to create breed ${breedData.name}:`, error.message);
            }
        }
        console.log(`Successfully seeded ${createdBreeds.length} breeds.`);
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
seedBreeds();
//# sourceMappingURL=seed-standalone.js.map