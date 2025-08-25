"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedBreeds = seedBreeds;
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const breeds_seed_service_1 = require("./features/breeds/breeds-seed.service");
async function seedBreeds() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    try {
        const breedsSeedService = app.get(breeds_seed_service_1.BreedsSeedService);
        await breedsSeedService.seedBreeds();
        console.log('Seeding completed successfully!');
    }
    catch (error) {
        console.error('Seeding failed:', error);
    }
    finally {
        await app.close();
    }
}
if (require.main === module) {
    seedBreeds();
}
//# sourceMappingURL=seed.js.map