import { IsString, IsOptional, IsBoolean, IsArray, IsEnum, IsUUID, MaxLength, IsUrl } from 'class-validator';
import { BlogPostStatus } from '../entities/blog-post.entity';

export class CreateBlogPostDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  @MaxLength(255)
  slug: string;

  @IsString()
  description: string;

  @IsString()
  content: string; // Rich text content

  @IsString()
  @MaxLength(255)
  author: string;

  @IsOptional()
  @IsUrl()
  authorImage?: string;

  @IsUrl()
  featuredImage: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsBoolean()
  flipImage?: boolean = false;

  @IsOptional()
  @IsEnum(BlogPostStatus)
  status?: BlogPostStatus = BlogPostStatus.DRAFT;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean = false;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean = false;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metaKeywords?: string[];

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsUUID()
  createdById?: string;
}
