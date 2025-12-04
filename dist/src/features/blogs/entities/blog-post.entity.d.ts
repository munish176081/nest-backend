import { BlogCategory } from './blog-category.entity';
import { User } from '../../accounts/entities/account.entity';
export declare enum BlogPostStatus {
    DRAFT = "draft",
    PUBLISHED = "published",
    ARCHIVED = "archived"
}
export declare class BlogPost {
    id: string;
    slug: string;
    title: string;
    description: string;
    content: string;
    author: string;
    authorImage?: string;
    featuredImage: string;
    images?: string[];
    flipImage: boolean;
    status: BlogPostStatus;
    tags: string[];
    viewCount: number;
    likeCount: number;
    shareCount: number;
    isFeatured: boolean;
    isPinned: boolean;
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    publishedAt?: Date;
    category: BlogCategory;
    categoryId: string;
    createdBy?: User;
    createdById?: string;
    createdAt: Date;
    updatedAt: Date;
}
