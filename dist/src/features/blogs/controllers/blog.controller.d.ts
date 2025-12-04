import { BlogService } from '../services/blog.service';
import { CreateBlogPostDto } from '../dto/create-blog-post.dto';
import { UpdateBlogPostDto } from '../dto/update-blog-post.dto';
import { CreateBlogCategoryDto } from '../dto/create-blog-category.dto';
import { QueryBlogPostDto } from '../dto/query-blog-post.dto';
export declare class BlogController {
    private readonly blogService;
    constructor(blogService: BlogService);
    findAllPosts(queryDto: QueryBlogPostDto): Promise<{
        posts: import("../entities/blog-post.entity").BlogPost[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getFeaturedPosts(limit?: number): Promise<import("../entities/blog-post.entity").BlogPost[]>;
    getRecentPosts(limit?: number): Promise<import("../entities/blog-post.entity").BlogPost[]>;
    searchPosts(searchTerm: string, limit?: number): Promise<import("../entities/blog-post.entity").BlogPost[]>;
    findAllCategories(): Promise<import("../entities/blog-category.entity").BlogCategory[]>;
    findCategoryBySlug(slug: string): Promise<import("../entities/blog-category.entity").BlogCategory>;
    findPostBySlug(slug: string): Promise<import("../entities/blog-post.entity").BlogPost>;
    findRelatedPosts(id: string, limit?: number): Promise<import("../entities/blog-post.entity").BlogPost[]>;
    createPost(createPostDto: CreateBlogPostDto): Promise<import("../entities/blog-post.entity").BlogPost>;
    findPostById(id: string): Promise<import("../entities/blog-post.entity").BlogPost>;
    updatePost(id: string, updateData: UpdateBlogPostDto): Promise<import("../entities/blog-post.entity").BlogPost>;
    deletePost(id: string): Promise<void>;
    createCategory(createCategoryDto: CreateBlogCategoryDto): Promise<import("../entities/blog-category.entity").BlogCategory>;
    findCategoryById(id: string): Promise<import("../entities/blog-category.entity").BlogCategory>;
    updateCategory(id: string, updateData: Partial<CreateBlogCategoryDto>): Promise<import("../entities/blog-category.entity").BlogCategory>;
    deleteCategory(id: string): Promise<void>;
}
