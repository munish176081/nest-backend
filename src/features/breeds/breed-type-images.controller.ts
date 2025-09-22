import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BreedTypeImagesService } from './breed-type-images.service';
import { BreedsService } from './breeds.service';
import { CreateBreedTypeImageDto } from './dto/create-breed-type-image.dto';
import { UpdateBreedTypeImageDto } from './dto/update-breed-type-image.dto';
import { LoggedInGuard } from '../../middleware/LoggedInGuard';
import { AdminGuard } from '../../middleware/AdminGuard';


@Controller('breed-type-images')
export class BreedTypeImagesController {
  constructor(
    private readonly breedTypeImagesService: BreedTypeImagesService,
    private readonly breedsService: BreedsService
  ) {}

  // Public endpoints
  @Get('homepage/featured')
  findFeatured() {
    return this.breedTypeImagesService.findActive();
  }

  // Admin endpoints
  @Get('admin/active')
  @UseGuards(LoggedInGuard, AdminGuard)
  findActive() {
    return this.breedTypeImagesService.findActive();
  }

  @Post('admin/categories')
  @UseGuards(LoggedInGuard, AdminGuard)
  createCategory(@Body() body: { category: string }) {
    return this.breedsService.createCategory(body.category);
  }

  @Post('admin')
  @UseGuards(LoggedInGuard, AdminGuard)
  create(@Body() createBreedTypeImageDto: CreateBreedTypeImageDto) {
    return this.breedTypeImagesService.create(createBreedTypeImageDto);
  }

  @Get('admin')
  @UseGuards(LoggedInGuard, AdminGuard)
  findAll() {
    return this.breedTypeImagesService.findAll();
  }

  @Get('admin/:id')
  @UseGuards(LoggedInGuard, AdminGuard)
  findOne(@Param('id') id: string) {
    return this.breedTypeImagesService.findOne(id);
  }

  @Get('admin/category/:category')
  @UseGuards(LoggedInGuard, AdminGuard)
  findByCategory(@Param('category') category: string) {
    return this.breedTypeImagesService.findByCategory(category);
  }

  @Patch('admin/:id')
  @UseGuards(LoggedInGuard, AdminGuard)
  update(@Param('id') id: string, @Body() updateBreedTypeImageDto: UpdateBreedTypeImageDto) {
    return this.breedTypeImagesService.update(id, updateBreedTypeImageDto);
  }

  @Patch('admin/:id/toggle-status')
  @UseGuards(LoggedInGuard, AdminGuard)
  toggleStatus(@Param('id') id: string) {
    return this.breedTypeImagesService.toggleStatus(id);
  }

  @Delete('admin/:id')
  @UseGuards(LoggedInGuard, AdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.breedTypeImagesService.remove(id);
  }

  @Get('admin/categories/available')
  @UseGuards(LoggedInGuard, AdminGuard)
  getAvailableCategories() {
    return this.breedTypeImagesService.getAvailableCategoriesForImages();
  }

  @Get('admin/categories/unique')
  @UseGuards(LoggedInGuard, AdminGuard)
  getUniqueCategories() {
    return this.breedTypeImagesService.getUniqueCategoriesFromBreeds();
  }

  @Post('admin/category/:category')
  @UseGuards(LoggedInGuard, AdminGuard)
  createImageForCategory(
    @Param('category') category: string,
    @Body() body: { imageUrl: string; title?: string; description?: string }
  ) {
    return this.breedTypeImagesService.createImageForCategory(
      category,
      body.imageUrl,
      body.title,
      body.description
    );
  }
}
