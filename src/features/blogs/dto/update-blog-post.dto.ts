import { PartialType } from '@nestjs/mapped-types';
import { CreateBlogPostDto } from './create-blog-post.dto';
import { IsOptional, IsDateString } from 'class-validator';

export class UpdateBlogPostDto extends PartialType(CreateBlogPostDto) {
  @IsOptional()
  @IsDateString()
  publishedAt?: Date;
}
