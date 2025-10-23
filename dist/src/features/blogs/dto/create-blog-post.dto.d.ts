import { BlogPostStatus } from '../entities/blog-post.entity';
export declare class CreateBlogPostDto {
    title: string;
    slug: string;
    description: string;
    content: string;
    author: string;
    authorImage?: string;
    featuredImage: string;
    images?: string[];
    flipImage?: boolean;
    status?: BlogPostStatus;
    tags?: string[];
    isFeatured?: boolean;
    isPinned?: boolean;
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    categoryId: string;
    createdById?: string;
}
