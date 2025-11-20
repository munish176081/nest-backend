"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadModule = void 0;
const common_1 = require("@nestjs/common");
const upload_controller_1 = require("./upload.controller");
const upload_service_1 = require("./upload.service");
const r2_service_1 = require("./r2.service");
const upload_repository_1 = require("./upload.repository");
const typeorm_1 = require("@nestjs/typeorm");
const upload_entity_1 = require("./entities/upload.entity");
const authentication_module_1 = require("../authentication/authentication.module");
const users_module_1 = require("../accounts/users.module");
const LoggedInGuard_1 = require("../../middleware/LoggedInGuard");
let UploadModule = class UploadModule {
};
exports.UploadModule = UploadModule;
exports.UploadModule = UploadModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([upload_entity_1.Upload]),
            authentication_module_1.AuthModule,
            users_module_1.UsersModule,
        ],
        controllers: [upload_controller_1.UploadController],
        providers: [
            upload_service_1.UploadService,
            r2_service_1.R2Service,
            upload_repository_1.UploadRepository,
            LoggedInGuard_1.LoggedInGuard,
        ],
        exports: [upload_service_1.UploadService],
    })
], UploadModule);
//# sourceMappingURL=upload.module.js.map