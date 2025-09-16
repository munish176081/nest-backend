import { Injectable, NotFoundException } from '@nestjs/common';
import { BlogRepository } from '../repositories/blog.repository';
import { CreateBlogPostDto } from '../dto/create-blog-post.dto';
import { UpdateBlogPostDto } from '../dto/update-blog-post.dto';
import { CreateBlogCategoryDto } from '../dto/create-blog-category.dto';
import { QueryBlogPostDto } from '../dto/query-blog-post.dto';
import { BlogPost, BlogPostStatus } from '../entities/blog-post.entity';
import { BlogCategory } from '../entities/blog-category.entity';

@Injectable()
export class BlogService {
  constructor(private readonly blogRepository: BlogRepository) {}

  // Blog Post Methods
  async createPost(createPostDto: CreateBlogPostDto): Promise<BlogPost> {
    // Set publishedAt if status is published
    const postData = {
      ...createPostDto,
      publishedAt: createPostDto.status === BlogPostStatus.PUBLISHED ? new Date() : null,
    };

    const post = await this.blogRepository.createPost(postData);
    
    // Update category post count
    await this.blogRepository.updateCategoryPostCount(post.categoryId);
    
    return post;
  }

  async findAllPosts(queryDto: QueryBlogPostDto) {
    return await this.blogRepository.findPosts(queryDto);
  }

  async findPostById(id: string): Promise<BlogPost> {
    const post = await this.blogRepository.findPostById(id);
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }
    return post;
  }

  async findPostBySlug(slug: string): Promise<BlogPost> {
    const post = await this.blogRepository.findPostBySlug(slug);
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }
    return post;
  }

  async findPostBySlugWithViewIncrement(slug: string): Promise<BlogPost> {
    const post = await this.findPostBySlug(slug);
    
    // Increment view count
    await this.blogRepository.incrementViewCount(post.id);
    post.viewCount += 1;
    
    return post;
  }

  async findRelatedPosts(postId: string, limit: number = 4): Promise<BlogPost[]> {
    const post = await this.findPostById(postId);
    return await this.blogRepository.findRelatedPosts(
      postId,
      post.categoryId,
      post.tags || [],
      limit
    );
  }

  async updatePost(id: string, updateData: UpdateBlogPostDto): Promise<BlogPost> {
    const existingPost = await this.findPostById(id);
    
    // Set publishedAt if status is being changed to published
    if (updateData.status === BlogPostStatus.PUBLISHED && existingPost.status !== BlogPostStatus.PUBLISHED) {
      updateData.publishedAt = new Date();
    }

    const updatedPost = await this.blogRepository.updatePost(id, updateData);
    
    // Update category post count if category changed
    if (updateData.categoryId && updateData.categoryId !== existingPost.categoryId) {
      await this.blogRepository.updateCategoryPostCount(existingPost.categoryId);
      await this.blogRepository.updateCategoryPostCount(updateData.categoryId);
    }
    
    return updatedPost;
  }

  async deletePost(id: string): Promise<void> {
    const post = await this.findPostById(id);
    await this.blogRepository.deletePost(id);
    
    // Update category post count
    await this.blogRepository.updateCategoryPostCount(post.categoryId);
  }

  // Blog Category Methods
  async createCategory(createCategoryDto: CreateBlogCategoryDto): Promise<BlogCategory> {
    return await this.blogRepository.createCategory(createCategoryDto);
  }

  async findAllCategories(): Promise<BlogCategory[]> {
    return await this.blogRepository.findAllCategories();
  }

  async findCategoryById(id: string): Promise<BlogCategory> {
    const category = await this.blogRepository.findCategoryById(id);
    if (!category) {
      throw new NotFoundException('Blog category not found');
    }
    return category;
  }

  async findCategoryBySlug(slug: string): Promise<BlogCategory> {
    const category = await this.blogRepository.findCategoryBySlug(slug);
    if (!category) {
      throw new NotFoundException('Blog category not found');
    }
    return category;
  }

  async updateCategory(id: string, updateData: Partial<CreateBlogCategoryDto>): Promise<BlogCategory> {
    await this.findCategoryById(id); // Check if category exists
    return await this.blogRepository.updateCategory(id, updateData);
  }

  async deleteCategory(id: string): Promise<void> {
    await this.findCategoryById(id); // Check if category exists
    await this.blogRepository.deleteCategory(id);
  }

  // Utility Methods
  async getFeaturedPosts(limit: number = 6): Promise<BlogPost[]> {
    const queryDto: QueryBlogPostDto = {
      isFeatured: true,
      limit,
      sortBy: 'publishedAt',
      sortOrder: 'DESC',
    };
    
    const result = await this.blogRepository.findPosts(queryDto);
    return result.posts;
  }

  async getRecentPosts(limit: number = 6): Promise<BlogPost[]> {
    const queryDto: QueryBlogPostDto = {
      limit,
      sortBy: 'publishedAt',
      sortOrder: 'DESC',
    };
    
    const result = await this.blogRepository.findPosts(queryDto);
    return result.posts;
  }

  async searchPosts(searchTerm: string, limit: number = 12): Promise<BlogPost[]> {
    const queryDto: QueryBlogPostDto = {
      search: searchTerm,
      limit,
      sortBy: 'publishedAt',
      sortOrder: 'DESC',
    };
    
    const result = await this.blogRepository.findPosts(queryDto);
    return result.posts;
  }
}
