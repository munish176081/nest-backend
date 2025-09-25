import { Repository } from 'typeorm';
import { BlogPost } from '../entities/blog-post.entity';
import { BlogCategory } from '../entities/blog-category.entity';
import { QueryBlogPostDto } from '../dto/query-blog-post.dto';
export declare class BlogRepository {
    private readonly blogPostRepository;
    private readonly blogCategoryRepository;
    constructor(blogPostRepository: Repository<BlogPost>, blogCategoryRepository: Repository<BlogCategory>);
    createPost(postData: Partial<BlogPost>): Promise<BlogPost>;
    findPostById(id: string): Promise<BlogPost | null>;
    findPostBySlug(slug: string): Promise<BlogPost | null>;
    findPosts(queryDto: QueryBlogPostDto): Promise<{
        posts: BlogPost[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findRelatedPosts(postId: string, categoryId: string, tags: string[], limit?: number): Promise<BlogPost[]>;
    incrementViewCount(postId: string): Promise<void>;
    updatePost(id: string, updateData: Partial<BlogPost>): Promise<BlogPost | null>;
    deletePost(id: string): Promise<void>;
    createCategory(categoryData: Partial<BlogCategory>): Promise<BlogCategory>;
    findCategoryById(id: string): Promise<BlogCategory | null>;
    findCategoryBySlug(slug: string): Promise<BlogCategory | null>;
    findAllCategories(): Promise<BlogCategory[]>;
    updateCategoryPostCount(categoryId: string): Promise<void>;
    updateCategory(id: string, updateData: Partial<BlogCategory>): Promise<BlogCategory | null>;
    deleteCategory(id: string): Promise<void>;
    private buildPostQueryBuilder;
}
