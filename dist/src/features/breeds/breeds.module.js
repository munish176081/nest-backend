"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BreedsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const breeds_service_1 = require("./breeds.service");
const breeds_controller_1 = require("./breeds.controller");
const breeds_seed_service_1 = require("./breeds-seed.service");
const breed_type_images_service_1 = require("./breed-type-images.service");
const breed_type_images_controller_1 = require("./breed-type-images.controller");
const breed_entity_1 = require("./entities/breed.entity");
const breed_type_image_entity_1 = require("./entities/breed-type-image.entity");
const authentication_module_1 = require("../authentication/authentication.module");
const users_module_1 = require("../accounts/users.module");
const LoggedInGuard_1 = require("../../middleware/LoggedInGuard");
const AdminGuard_1 = require("../../middleware/AdminGuard");
let BreedsModule = class BreedsModule {
};
exports.BreedsModule = BreedsModule;
exports.BreedsModule = BreedsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([breed_entity_1.Breed, breed_type_image_entity_1.BreedTypeImage]),
            (0, common_1.forwardRef)(() => authentication_module_1.AuthModule),
            (0, common_1.forwardRef)(() => users_module_1.UsersModule),
        ],
        controllers: [breeds_controller_1.BreedsController, breed_type_images_controller_1.BreedTypeImagesController],
        providers: [breeds_service_1.BreedsService, breeds_seed_service_1.BreedsSeedService, breed_type_images_service_1.BreedTypeImagesService, LoggedInGuard_1.LoggedInGuard, AdminGuard_1.AdminGuard],
        exports: [breeds_service_1.BreedsService, breeds_seed_service_1.BreedsSeedService, breed_type_images_service_1.BreedTypeImagesService],
    })
], BreedsModule);
//# sourceMappingURL=breeds.module.js.map