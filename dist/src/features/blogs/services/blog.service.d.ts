import { BlogRepository } from '../repositories/blog.repository';
import { CreateBlogPostDto } from '../dto/create-blog-post.dto';
import { UpdateBlogPostDto } from '../dto/update-blog-post.dto';
import { CreateBlogCategoryDto } from '../dto/create-blog-category.dto';
import { QueryBlogPostDto } from '../dto/query-blog-post.dto';
import { BlogPost } from '../entities/blog-post.entity';
import { BlogCategory } from '../entities/blog-category.entity';
export declare class BlogService {
    private readonly blogRepository;
    constructor(blogRepository: BlogRepository);
    createPost(createPostDto: CreateBlogPostDto): Promise<BlogPost>;
    findAllPosts(queryDto: QueryBlogPostDto): Promise<{
        posts: BlogPost[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findPostById(id: string): Promise<BlogPost>;
    findPostBySlug(slug: string): Promise<BlogPost>;
    findPostBySlugWithViewIncrement(slug: string): Promise<BlogPost>;
    findRelatedPosts(postId: string, limit?: number): Promise<BlogPost[]>;
    updatePost(id: string, updateData: UpdateBlogPostDto): Promise<BlogPost>;
    deletePost(id: string): Promise<void>;
    createCategory(createCategoryDto: CreateBlogCategoryDto): Promise<BlogCategory>;
    findAllCategories(): Promise<BlogCategory[]>;
    findCategoryById(id: string): Promise<BlogCategory>;
    findCategoryBySlug(slug: string): Promise<BlogCategory>;
    updateCategory(id: string, updateData: Partial<CreateBlogCategoryDto>): Promise<BlogCategory>;
    deleteCategory(id: string): Promise<void>;
    getFeaturedPosts(limit?: number): Promise<BlogPost[]>;
    getRecentPosts(limit?: number): Promise<BlogPost[]>;
    searchPosts(searchTerm: string, limit?: number): Promise<BlogPost[]>;
}
