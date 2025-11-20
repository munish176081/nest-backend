"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersModule = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const users_controller_1 = require("./users.controller");
const admin_controller_1 = require("./admin.controller");
const activity_logs_controller_1 = require("./activity-logs.controller");
const activity_logs_service_1 = require("./activity-logs.service");
const typeorm_1 = require("@nestjs/typeorm");
const listings_module_1 = require("../listings/listings.module");
const account_entity_1 = require("./entities/account.entity");
const activity_log_entity_1 = require("./entities/activity-log.entity");
const authentication_module_1 = require("../authentication/authentication.module");
const LoggedInGuard_1 = require("../../middleware/LoggedInGuard");
const AdminGuard_1 = require("../../middleware/AdminGuard");
const ActiveUserGuard_1 = require("../../middleware/ActiveUserGuard");
let UsersModule = class UsersModule {
};
exports.UsersModule = UsersModule;
exports.UsersModule = UsersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([account_entity_1.User, activity_log_entity_1.ActivityLog]),
            (0, common_1.forwardRef)(() => listings_module_1.ListingsModule),
            (0, common_1.forwardRef)(() => authentication_module_1.AuthModule),
        ],
        controllers: [users_controller_1.UsersController, admin_controller_1.AdminController, activity_logs_controller_1.ActivityLogsController],
        providers: [users_service_1.UsersService, activity_logs_service_1.ActivityLogsService, LoggedInGuard_1.LoggedInGuard, AdminGuard_1.AdminGuard, ActiveUserGuard_1.ActiveUserGuard],
        exports: [users_service_1.UsersService, activity_logs_service_1.ActivityLogsService],
    })
], UsersModule);
//# sourceMappingURL=users.module.js.map