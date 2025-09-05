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
exports.BreedsSeedService = void 0;
const common_1 = require("@nestjs/common");
const breeds_service_1 = require("./breeds.service");
const breeds_seed_1 = require("./breeds.seed");
let BreedsSeedService = class BreedsSeedService {
    constructor(breedsService) {
        this.breedsService = breedsService;
    }
    async seedBreeds() {
        console.log('Starting breeds seeding...');
        const existingBreeds = await this.breedsService.findActiveBreeds();
        if (existingBreeds.length > 0) {
            console.log(`Found ${existingBreeds.length} existing breeds. Skipping seeding.`);
            return;
        }
        const createdBreeds = [];
        for (const breedData of breeds_seed_1.breedsSeedData) {
            try {
                const breed = await this.breedsService.create(breedData);
                createdBreeds.push(breed);
                console.log(`Created breed: ${breed.name}`);
            }
            catch (error) {
                console.error(`Failed to create breed ${breedData.name}:`, error.message);
            }
        }
        console.log(`Successfully seeded ${createdBreeds.length} breeds.`);
        return createdBreeds;
    }
    async clearBreeds() {
        console.log('Clearing all breeds...');
        console.log('Clear breeds functionality not implemented yet.');
    }
};
exports.BreedsSeedService = BreedsSeedService;
exports.BreedsSeedService = BreedsSeedService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [breeds_service_1.BreedsService])
], BreedsSeedService);
//# sourceMappingURL=breeds-seed.service.js.map