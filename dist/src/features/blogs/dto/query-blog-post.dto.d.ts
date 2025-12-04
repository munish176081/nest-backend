import { BlogPostStatus } from '../entities/blog-post.entity';
export declare class QueryBlogPostDto {
    search?: string;
    category?: string;
    tags?: string[];
    status?: BlogPostStatus;
    isFeatured?: boolean;
    isPinned?: boolean;
    author?: string;
    page?: number;
    limit?: number;
    sortBy?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'viewCount' | 'title';
    sortOrder?: 'ASC' | 'DESC';
    excludeId?: string;
}
