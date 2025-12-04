import { CreateBlogPostDto } from './create-blog-post.dto';
declare const UpdateBlogPostDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateBlogPostDto>>;
export declare class UpdateBlogPostDto extends UpdateBlogPostDto_base {
    publishedAt?: Date;
}
export {};
