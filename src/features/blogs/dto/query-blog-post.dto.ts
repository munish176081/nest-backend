import { IsOptional, IsString, IsEnum, IsNumber, IsBoolean, IsArray, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { BlogPostStatus } from '../entities/blog-post.entity';

export class QueryBlogPostDto {
  @IsOptional()
  @IsString()
  search?: string; // Search by title, tags, or categories

  @IsOptional()
  @IsString()
  category?: string; // Category slug

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]; // Filter by tags

  @IsOptional()
  @IsEnum(BlogPostStatus)
  status?: BlogPostStatus;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isPinned?: boolean;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 12;

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'viewCount' | 'title' = 'publishedAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @IsOptional()
  @IsUUID()
  excludeId?: string; // Exclude specific post (for related posts)
}
