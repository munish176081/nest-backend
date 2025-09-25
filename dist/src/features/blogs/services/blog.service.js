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
exports.BlogService = void 0;
const common_1 = require("@nestjs/common");
const blog_repository_1 = require("../repositories/blog.repository");
const blog_post_entity_1 = require("../entities/blog-post.entity");
let BlogService = class BlogService {
    constructor(blogRepository) {
        this.blogRepository = blogRepository;
    }
    async createPost(createPostDto) {
        const postData = {
            ...createPostDto,
            publishedAt: createPostDto.status === blog_post_entity_1.BlogPostStatus.PUBLISHED ? new Date() : null,
        };
        const post = await this.blogRepository.createPost(postData);
        await this.blogRepository.updateCategoryPostCount(post.categoryId);
        return post;
    }
    async findAllPosts(queryDto) {
        return await this.blogRepository.findPosts(queryDto);
    }
    async findPostById(id) {
        const post = await this.blogRepository.findPostById(id);
        if (!post) {
            throw new common_1.NotFoundException('Blog post not found');
        }
        return post;
    }
    async findPostBySlug(slug) {
        const post = await this.blogRepository.findPostBySlug(slug);
        if (!post) {
            throw new common_1.NotFoundException('Blog post not found');
        }
        return post;
    }
    async findPostBySlugWithViewIncrement(slug) {
        const post = await this.findPostBySlug(slug);
        await this.blogRepository.incrementViewCount(post.id);
        post.viewCount += 1;
        return post;
    }
    async findRelatedPosts(postId, limit = 4) {
        const post = await this.findPostById(postId);
        return await this.blogRepository.findRelatedPosts(postId, post.categoryId, post.tags || [], limit);
    }
    async updatePost(id, updateData) {
        const existingPost = await this.findPostById(id);
        if (updateData.status === blog_post_entity_1.BlogPostStatus.PUBLISHED && existingPost.status !== blog_post_entity_1.BlogPostStatus.PUBLISHED) {
            updateData.publishedAt = new Date();
        }
        const updatedPost = await this.blogRepository.updatePost(id, updateData);
        if (updateData.categoryId && updateData.categoryId !== existingPost.categoryId) {
            await this.blogRepository.updateCategoryPostCount(existingPost.categoryId);
            await this.blogRepository.updateCategoryPostCount(updateData.categoryId);
        }
        return updatedPost;
    }
    async deletePost(id) {
        const post = await this.findPostById(id);
        await this.blogRepository.deletePost(id);
        await this.blogRepository.updateCategoryPostCount(post.categoryId);
    }
    async createCategory(createCategoryDto) {
        return await this.blogRepository.createCategory(createCategoryDto);
    }
    async findAllCategories() {
        return await this.blogRepository.findAllCategories();
    }
    async findCategoryById(id) {
        const category = await this.blogRepository.findCategoryById(id);
        if (!category) {
            throw new common_1.NotFoundException('Blog category not found');
        }
        return category;
    }
    async findCategoryBySlug(slug) {
        const category = await this.blogRepository.findCategoryBySlug(slug);
        if (!category) {
            throw new common_1.NotFoundException('Blog category not found');
        }
        return category;
    }
    async updateCategory(id, updateData) {
        await this.findCategoryById(id);
        return await this.blogRepository.updateCategory(id, updateData);
    }
    async deleteCategory(id) {
        await this.findCategoryById(id);
        await this.blogRepository.deleteCategory(id);
    }
    async getFeaturedPosts(limit = 6) {
        const queryDto = {
            isFeatured: true,
            limit,
            sortBy: 'publishedAt',
            sortOrder: 'DESC',
        };
        const result = await this.blogRepository.findPosts(queryDto);
        return result.posts;
    }
    async getRecentPosts(limit = 6) {
        const queryDto = {
            limit,
            sortBy: 'publishedAt',
            sortOrder: 'DESC',
        };
        const result = await this.blogRepository.findPosts(queryDto);
        return result.posts;
    }
    async searchPosts(searchTerm, limit = 12) {
        const queryDto = {
            search: searchTerm,
            limit,
            sortBy: 'publishedAt',
            sortOrder: 'DESC',
        };
        const result = await this.blogRepository.findPosts(queryDto);
        return result.posts;
    }
};
exports.BlogService = BlogService;
exports.BlogService = BlogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [blog_repository_1.BlogRepository])
], BlogService);
//# sourceMappingURL=blog.service.js.map