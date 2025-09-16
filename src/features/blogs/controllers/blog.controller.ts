import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { BlogService } from '../services/blog.service';
import { CreateBlogPostDto } from '../dto/create-blog-post.dto';
import { UpdateBlogPostDto } from '../dto/update-blog-post.dto';
import { CreateBlogCategoryDto } from '../dto/create-blog-category.dto';
import { QueryBlogPostDto } from '../dto/query-blog-post.dto';
import { LoggedInGuard } from '../../../middleware/LoggedInGuard';
import { ActiveUserGuard } from '../../../middleware/ActiveUserGuard';

@Controller('blogs')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  // Public Blog Post Endpoints
  @Get()
  async findAllPosts(@Query() queryDto: QueryBlogPostDto) {
    return await this.blogService.findAllPosts(queryDto);
  }

  @Get('featured')
  async getFeaturedPosts(@Query('limit') limit?: number) {
    return await this.blogService.getFeaturedPosts(limit);
  }

  @Get('recent')
  async getRecentPosts(@Query('limit') limit?: number) {
    return await this.blogService.getRecentPosts(limit);
  }

  @Get('search')
  async searchPosts(
    @Query('q') searchTerm: string,
    @Query('limit') limit?: number,
  ) {
    return await this.blogService.searchPosts(searchTerm, limit);
  }

  @Get('categories')
  async findAllCategories() {
    return await this.blogService.findAllCategories();
  }

  @Get('categories/:slug')
  async findCategoryBySlug(@Param('slug') slug: string) {
    return await this.blogService.findCategoryBySlug(slug);
  }

  @Get('posts/:slug')
  async findPostBySlug(@Param('slug') slug: string) {
    return await this.blogService.findPostBySlugWithViewIncrement(slug);
  }

  @Get('posts/:id/related')
  async findRelatedPosts(
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ) {
    return await this.blogService.findRelatedPosts(id, limit);
  }

  // Admin Blog Post Endpoints
  @UseGuards(LoggedInGuard, ActiveUserGuard)
  @Post('posts')
  @HttpCode(HttpStatus.CREATED)
  async createPost(@Body() createPostDto: CreateBlogPostDto) {
    return await this.blogService.createPost(createPostDto);
  }

  @UseGuards(LoggedInGuard, ActiveUserGuard)
  @Get('posts/:id')
  async findPostById(@Param('id') id: string) {
    return await this.blogService.findPostById(id);
  }

  @UseGuards(LoggedInGuard, ActiveUserGuard)
  @Put('posts/:id')
  async updatePost(
    @Param('id') id: string,
    @Body() updateData: UpdateBlogPostDto,
  ) {
    return await this.blogService.updatePost(id, updateData);
  }

  @UseGuards(LoggedInGuard, ActiveUserGuard)
  @Delete('posts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePost(@Param('id') id: string) {
    await this.blogService.deletePost(id);
  }

  // Admin Blog Category Endpoints
  @UseGuards(LoggedInGuard, ActiveUserGuard)
  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  async createCategory(@Body() createCategoryDto: CreateBlogCategoryDto) {
    return await this.blogService.createCategory(createCategoryDto);
  }

  @UseGuards(LoggedInGuard, ActiveUserGuard)
  @Get('categories/:id')
  async findCategoryById(@Param('id') id: string) {
    return await this.blogService.findCategoryById(id);
  }

  @UseGuards(LoggedInGuard, ActiveUserGuard)
  @Put('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateBlogCategoryDto>,
  ) {
    return await this.blogService.updateCategory(id, updateData);
  }

  @UseGuards(LoggedInGuard, ActiveUserGuard)
  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(@Param('id') id: string) {
    await this.blogService.deleteCategory(id);
  }
}
