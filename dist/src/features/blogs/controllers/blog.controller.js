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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogController = void 0;
const common_1 = require("@nestjs/common");
const blog_service_1 = require("../services/blog.service");
const create_blog_post_dto_1 = require("../dto/create-blog-post.dto");
const update_blog_post_dto_1 = require("../dto/update-blog-post.dto");
const create_blog_category_dto_1 = require("../dto/create-blog-category.dto");
const query_blog_post_dto_1 = require("../dto/query-blog-post.dto");
const LoggedInGuard_1 = require("../../../middleware/LoggedInGuard");
const ActiveUserGuard_1 = require("../../../middleware/ActiveUserGuard");
let BlogController = class BlogController {
    constructor(blogService) {
        this.blogService = blogService;
    }
    async findAllPosts(queryDto) {
        return await this.blogService.findAllPosts(queryDto);
    }
    async getFeaturedPosts(limit) {
        return await this.blogService.getFeaturedPosts(limit);
    }
    async getRecentPosts(limit) {
        return await this.blogService.getRecentPosts(limit);
    }
    async searchPosts(searchTerm, limit) {
        return await this.blogService.searchPosts(searchTerm, limit);
    }
    async findAllCategories() {
        return await this.blogService.findAllCategories();
    }
    async findCategoryBySlug(slug) {
        return await this.blogService.findCategoryBySlug(slug);
    }
    async findPostBySlug(slug) {
        return await this.blogService.findPostBySlugWithViewIncrement(slug);
    }
    async findRelatedPosts(id, limit) {
        return await this.blogService.findRelatedPosts(id, limit);
    }
    async createPost(createPostDto) {
        return await this.blogService.createPost(createPostDto);
    }
    async findPostById(id) {
        return await this.blogService.findPostById(id);
    }
    async updatePost(id, updateData) {
        return await this.blogService.updatePost(id, updateData);
    }
    async deletePost(id) {
        await this.blogService.deletePost(id);
    }
    async createCategory(createCategoryDto) {
        return await this.blogService.createCategory(createCategoryDto);
    }
    async findCategoryById(id) {
        return await this.blogService.findCategoryById(id);
    }
    async updateCategory(id, updateData) {
        return await this.blogService.updateCategory(id, updateData);
    }
    async deleteCategory(id) {
        await this.blogService.deleteCategory(id);
    }
};
exports.BlogController = BlogController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_blog_post_dto_1.QueryBlogPostDto]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "findAllPosts", null);
__decorate([
    (0, common_1.Get)('featured'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "getFeaturedPosts", null);
__decorate([
    (0, common_1.Get)('recent'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "getRecentPosts", null);
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "searchPosts", null);
__decorate([
    (0, common_1.Get)('categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "findAllCategories", null);
__decorate([
    (0, common_1.Get)('categories/:slug'),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "findCategoryBySlug", null);
__decorate([
    (0, common_1.Get)('posts/:slug'),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "findPostBySlug", null);
__decorate([
    (0, common_1.Get)('posts/:id/related'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "findRelatedPosts", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, ActiveUserGuard_1.ActiveUserGuard),
    (0, common_1.Post)('posts'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_blog_post_dto_1.CreateBlogPostDto]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "createPost", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, ActiveUserGuard_1.ActiveUserGuard),
    (0, common_1.Get)('posts/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "findPostById", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, ActiveUserGuard_1.ActiveUserGuard),
    (0, common_1.Put)('posts/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_blog_post_dto_1.UpdateBlogPostDto]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "updatePost", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, ActiveUserGuard_1.ActiveUserGuard),
    (0, common_1.Delete)('posts/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "deletePost", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, ActiveUserGuard_1.ActiveUserGuard),
    (0, common_1.Post)('categories'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_blog_category_dto_1.CreateBlogCategoryDto]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "createCategory", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, ActiveUserGuard_1.ActiveUserGuard),
    (0, common_1.Get)('categories/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "findCategoryById", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, ActiveUserGuard_1.ActiveUserGuard),
    (0, common_1.Put)('categories/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "updateCategory", null);
__decorate([
    (0, common_1.UseGuards)(LoggedInGuard_1.LoggedInGuard, ActiveUserGuard_1.ActiveUserGuard),
    (0, common_1.Delete)('categories/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BlogController.prototype, "deleteCategory", null);
exports.BlogController = BlogController = __decorate([
    (0, common_1.Controller)('blogs'),
    __metadata("design:paramtypes", [blog_service_1.BlogService])
], BlogController);
//# sourceMappingURL=blog.controller.js.map