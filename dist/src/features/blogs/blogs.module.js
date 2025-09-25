"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const blog_post_entity_1 = require("./entities/blog-post.entity");
const blog_category_entity_1 = require("./entities/blog-category.entity");
const blog_repository_1 = require("./repositories/blog.repository");
const blog_service_1 = require("./services/blog.service");
const blog_controller_1 = require("./controllers/blog.controller");
const authentication_module_1 = require("../authentication/authentication.module");
const users_module_1 = require("../accounts/users.module");
const LoggedInGuard_1 = require("../../middleware/LoggedInGuard");
const ActiveUserGuard_1 = require("../../middleware/ActiveUserGuard");
let BlogsModule = class BlogsModule {
};
exports.BlogsModule = BlogsModule;
exports.BlogsModule = BlogsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([blog_post_entity_1.BlogPost, blog_category_entity_1.BlogCategory]),
            authentication_module_1.AuthModule,
            users_module_1.UsersModule,
        ],
        providers: [blog_repository_1.BlogRepository, blog_service_1.BlogService, LoggedInGuard_1.LoggedInGuard, ActiveUserGuard_1.ActiveUserGuard],
        controllers: [blog_controller_1.BlogController],
        exports: [blog_service_1.BlogService, blog_repository_1.BlogRepository],
    })
], BlogsModule);
//# sourceMappingURL=blogs.module.js.map