import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, ILike, In } from 'typeorm';
import { BlogPost, BlogPostStatus } from '../entities/blog-post.entity';
import { BlogCategory } from '../entities/blog-category.entity';
import { QueryBlogPostDto } from '../dto/query-blog-post.dto';

@Injectable()
export class BlogRepository {
  constructor(
    @InjectRepository(BlogPost)
    private readonly blogPostRepository: Repository<BlogPost>,
    @InjectRepository(BlogCategory)
    private readonly blogCategoryRepository: Repository<BlogCategory>,
  ) {}

  // Blog Post Methods
  async createPost(postData: Partial<BlogPost>): Promise<BlogPost> {
    const post = this.blogPostRepository.create(postData);
    return await this.blogPostRepository.save(post);
  }

  async findPostById(id: string): Promise<BlogPost | null> {
    return await this.blogPostRepository.findOne({
      where: { id },
      relations: ['category', 'createdBy'],
    });
  }

  async findPostBySlug(slug: string): Promise<BlogPost | null> {
    return await this.blogPostRepository.findOne({
      where: { slug },
      relations: ['category', 'createdBy'],
    });
  }

  async findPosts(queryDto: QueryBlogPostDto): Promise<{
    posts: BlogPost[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
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

  async findRelatedPosts(postId: string, categoryId: string, tags: string[], limit: number = 4): Promise<BlogPost[]> {
    const queryBuilder = this.blogPostRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.category', 'category')
      .where('post.id != :postId', { postId })
      .andWhere('post.status = :status', { status: BlogPostStatus.PUBLISHED })
      .andWhere('post.publishedAt IS NOT NULL')
      .andWhere('post.publishedAt <= NOW()')
      .orderBy('post.publishedAt', 'DESC')
      .limit(limit);

    // Prioritize posts from same category
    if (categoryId) {
      queryBuilder.andWhere('post.categoryId = :categoryId', { categoryId });
    }

    // If no posts from same category, get posts with similar tags
    if (tags && tags.length > 0) {
      queryBuilder.orWhere('JSON_OVERLAPS(post.tags, :tags)', { tags: JSON.stringify(tags) });
    }

    return await queryBuilder.getMany();
  }

  async incrementViewCount(postId: string): Promise<void> {
    await this.blogPostRepository.increment({ id: postId }, 'viewCount', 1);
  }

  async updatePost(id: string, updateData: Partial<BlogPost>): Promise<BlogPost | null> {
    await this.blogPostRepository.update(id, updateData);
    return await this.findPostById(id);
  }

  async deletePost(id: string): Promise<void> {
    await this.blogPostRepository.delete(id);
  }

  // Blog Category Methods
  async createCategory(categoryData: Partial<BlogCategory>): Promise<BlogCategory> {
    const category = this.blogCategoryRepository.create(categoryData);
    return await this.blogCategoryRepository.save(category);
  }

  async findCategoryById(id: string): Promise<BlogCategory | null> {
    return await this.blogCategoryRepository.findOne({ where: { id } });
  }

  async findCategoryBySlug(slug: string): Promise<BlogCategory | null> {
    return await this.blogCategoryRepository.findOne({ where: { slug } });
  }

  async findAllCategories(): Promise<BlogCategory[]> {
    return await this.blogCategoryRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async updateCategoryPostCount(categoryId: string): Promise<void> {
    const count = await this.blogPostRepository.count({
      where: { 
        categoryId,
        status: BlogPostStatus.PUBLISHED,
      },
    });
    await this.blogCategoryRepository.update(categoryId, { postCount: count });
  }

  async updateCategory(id: string, updateData: Partial<BlogCategory>): Promise<BlogCategory | null> {
    await this.blogCategoryRepository.update(id, updateData);
    return await this.findCategoryById(id);
  }

  async deleteCategory(id: string): Promise<void> {
    await this.blogCategoryRepository.delete(id);
  }

  private buildPostQueryBuilder(queryDto: QueryBlogPostDto): SelectQueryBuilder<BlogPost> {
    const queryBuilder = this.blogPostRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.category', 'category')
      .leftJoinAndSelect('post.createdBy', 'createdBy');

    // Base filters - only published posts
    queryBuilder.andWhere('post.status = :status', { status: BlogPostStatus.PUBLISHED });
    queryBuilder.andWhere('post.publishedAt IS NOT NULL');
    queryBuilder.andWhere('post.publishedAt <= NOW()');

    // Search filter
    if (queryDto.search) {
      queryBuilder.andWhere(
        '(post.title ILIKE :search OR post.description ILIKE :search OR post.tags::text ILIKE :search OR category.name ILIKE :search)',
        { search: `%${queryDto.search}%` }
      );
    }

    // Category filter
    if (queryDto.category) {
      queryBuilder.andWhere('category.slug = :category', { category: queryDto.category });
    }

    // Tags filter
    if (queryDto.tags && queryDto.tags.length > 0) {
      queryBuilder.andWhere('JSON_OVERLAPS(post.tags, :tags)', { 
        tags: JSON.stringify(queryDto.tags) 
      });
    }

    // Status filter
    if (queryDto.status) {
      queryBuilder.andWhere('post.status = :status', { status: queryDto.status });
    }

    // Featured filter
    if (queryDto.isFeatured !== undefined) {
      queryBuilder.andWhere('post.isFeatured = :isFeatured', { isFeatured: queryDto.isFeatured });
    }

    // Pinned filter
    if (queryDto.isPinned !== undefined) {
      queryBuilder.andWhere('post.isPinned = :isPinned', { isPinned: queryDto.isPinned });
    }

    // Author filter
    if (queryDto.author) {
      queryBuilder.andWhere('post.author ILIKE :author', { author: `%${queryDto.author}%` });
    }

    // Exclude specific post
    if (queryDto.excludeId) {
      queryBuilder.andWhere('post.id != :excludeId', { excludeId: queryDto.excludeId });
    }

    return queryBuilder;
  }
}
