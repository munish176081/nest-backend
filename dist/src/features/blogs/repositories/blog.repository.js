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
exports.BlogRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const blog_post_entity_1 = require("../entities/blog-post.entity");
const blog_category_entity_1 = require("../entities/blog-category.entity");
let BlogRepository = class BlogRepository {
    constructor(blogPostRepository, blogCategoryRepository) {
        this.blogPostRepository = blogPostRepository;
        this.blogCategoryRepository = blogCategoryRepository;
    }
    async createPost(postData) {
        const post = this.blogPostRepository.create(postData);
        return await this.blogPostRepository.save(post);
    }
    async findPostById(id) {
        return await this.blogPostRepository.findOne({
            where: { id },
            relations: ['category', 'createdBy'],
        });
    }
    async findPostBySlug(slug) {
        return await this.blogPostRepository.findOne({
            where: { slug },
            relations: ['category', 'createdBy'],
        });
    }
    async findPosts(queryDto) {
        const { page = 1, limit = 12, sortBy = 'publishedAt', sortOrder = 'DESC' } = queryDto;
        const skip = (page - 1) * limit;
        const queryBuilder = this.buildPostQueryBuilder(queryDto);
        const [posts, total] = await queryBuilder
            .skip(skip)
            .take(limit)
            .orderBy(`post.${sortBy}`, sortOrder)
            .getManyAndCount();
        const totalPages = Math.ceil(total / limit);
        return {
            posts,
            total,
            page,
            limit,
            totalPages,
        };
    }
    async findRelatedPosts(postId, categoryId, tags, limit = 4) {
        const queryBuilder = this.blogPostRepository
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.category', 'category')
            .where('post.id != :postId', { postId })
            .andWhere('post.status = :status', { status: blog_post_entity_1.BlogPostStatus.PUBLISHED })
            .andWhere('post.publishedAt IS NOT NULL')
            .andWhere('post.publishedAt <= NOW()')
            .orderBy('post.publishedAt', 'DESC')
            .limit(limit);
        if (categoryId) {
            queryBuilder.andWhere('post.categoryId = :categoryId', { categoryId });
        }
        if (tags && tags.length > 0) {
            queryBuilder.orWhere('JSON_OVERLAPS(post.tags, :tags)', { tags: JSON.stringify(tags) });
        }
        return await queryBuilder.getMany();
    }
    async incrementViewCount(postId) {
        await this.blogPostRepository.increment({ id: postId }, 'viewCount', 1);
    }
    async updatePost(id, updateData) {
        await this.blogPostRepository.update(id, updateData);
        return await this.findPostById(id);
    }
    async deletePost(id) {
        await this.blogPostRepository.delete(id);
    }
    async createCategory(categoryData) {
        const category = this.blogCategoryRepository.create(categoryData);
        return await this.blogCategoryRepository.save(category);
    }
    async findCategoryById(id) {
        return await this.blogCategoryRepository.findOne({ where: { id } });
    }
    async findCategoryBySlug(slug) {
        return await this.blogCategoryRepository.findOne({ where: { slug } });
    }
    async findAllCategories() {
        return await this.blogCategoryRepository.find({
            where: { isActive: true },
            order: { name: 'ASC' },
        });
    }
    async updateCategoryPostCount(categoryId) {
        const count = await this.blogPostRepository.count({
            where: {
                categoryId,
                status: blog_post_entity_1.BlogPostStatus.PUBLISHED,
            },
        });
        await this.blogCategoryRepository.update(categoryId, { postCount: count });
    }
    async updateCategory(id, updateData) {
        await this.blogCategoryRepository.update(id, updateData);
        return await this.findCategoryById(id);
    }
    async deleteCategory(id) {
        await this.blogCategoryRepository.delete(id);
    }
    buildPostQueryBuilder(queryDto) {
        const queryBuilder = this.blogPostRepository
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.category', 'category')
            .leftJoinAndSelect('post.createdBy', 'createdBy');
        queryBuilder.andWhere('post.status = :status', { status: blog_post_entity_1.BlogPostStatus.PUBLISHED });
        queryBuilder.andWhere('post.publishedAt IS NOT NULL');
        queryBuilder.andWhere('post.publishedAt <= NOW()');
        if (queryDto.search) {
            queryBuilder.andWhere('(post.title ILIKE :search OR post.description ILIKE :search OR post.tags::text ILIKE :search OR category.name ILIKE :search)', { search: `%${queryDto.search}%` });
        }
        if (queryDto.category) {
            queryBuilder.andWhere('category.slug = :category', { category: queryDto.category });
        }
        if (queryDto.tags && queryDto.tags.length > 0) {
            queryBuilder.andWhere('JSON_OVERLAPS(post.tags, :tags)', {
                tags: JSON.stringify(queryDto.tags)
            });
        }
        if (queryDto.status) {
            queryBuilder.andWhere('post.status = :status', { status: queryDto.status });
        }
        if (queryDto.isFeatured !== undefined) {
            queryBuilder.andWhere('post.isFeatured = :isFeatured', { isFeatured: queryDto.isFeatured });
        }
        if (queryDto.isPinned !== undefined) {
            queryBuilder.andWhere('post.isPinned = :isPinned', { isPinned: queryDto.isPinned });
        }
        if (queryDto.author) {
            queryBuilder.andWhere('post.author ILIKE :author', { author: `%${queryDto.author}%` });
        }
        if (queryDto.excludeId) {
            queryBuilder.andWhere('post.id != :excludeId', { excludeId: queryDto.excludeId });
        }
        return queryBuilder;
    }
};
exports.BlogRepository = BlogRepository;
exports.BlogRepository = BlogRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(blog_post_entity_1.BlogPost)),
    __param(1, (0, typeorm_1.InjectRepository)(blog_category_entity_1.BlogCategory)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], BlogRepository);
//# sourceMappingURL=blog.repository.js.map