import { BlogPost } from './blog-post.entity';
export declare class BlogCategory {
    id: string;
    name: string;
    slug: string;
    description?: string;
    color?: string;
    postCount: number;
    isActive: boolean;
    posts: BlogPost[];
    createdAt: Date;
    updatedAt: Date;
}
