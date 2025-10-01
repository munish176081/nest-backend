import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BreedsService } from './breeds.service';
import { CreateBreedDto } from './dto/create-breed.dto';
import { UpdateBreedDto } from './dto/update-breed.dto';
import { QueryBreedDto } from './dto/query-breed.dto';
import { BreedResponseDto, PaginatedBreedsResponseDto } from './dto/breed-response.dto';
import { Serialize } from '../../transformers/serialize.interceptor';
import { LocalAuthGuard } from '../authentication/guards/local-auth.guard';
import { ActiveUserGuard } from '../../middleware/ActiveUserGuard';


@Controller('breeds')
export class BreedsController {
  constructor(private readonly breedsService: BreedsService) {}

  @Post()
  // @UseGuards(LocalAuthGuard)
  @Serialize(BreedResponseDto)
  create(@Body() createBreedDto: CreateBreedDto) {
    return this.breedsService.create(createBreedDto);
  }

  @Get()
  @Serialize(PaginatedBreedsResponseDto)
  async findAll(@Query() query: QueryBreedDto) {
    console.log('Controller received query:', query);
    const result = await this.breedsService.findAll(query);
    console.log('Controller returning result:', result);
    return result;
  }

  @Get('active')
  @Serialize(BreedResponseDto)
  findActiveBreeds() {
    return this.breedsService.findActiveBreeds();
  }

  @Get('homepage/featured')
  @Serialize(BreedResponseDto)
  findFeaturedBreeds() {
    return this.breedsService.findFeaturedBreeds();
  }

  @Get('categories')
  findCategories() {
    return this.breedsService.findCategories();
  }

  @Get('sizes')
  findSizes() {
    return this.breedsService.findSizes();
  }

  @Get('search')
  @Serialize(BreedResponseDto)
  searchBreeds(@Query('q') searchTerm: string) {
    if (!searchTerm) {
      return this.breedsService.findActiveBreeds();
    }
    return this.breedsService.searchBreeds(searchTerm);
  }

  // Public endpoint for breed type images
  @Get('type-images/homepage/featured')
  findFeaturedBreedTypeImages() {
    return this.breedsService.findActiveBreeds();

  }


  @Get('category/:category')
  @Serialize(BreedResponseDto)
  findBreedsByCategory(@Param('category') category: string) {
    return this.breedsService.findBreedsByCategory(category);
  }

  @Get('slug/:slug')
  @Serialize(BreedResponseDto)
  findBySlug(@Param('slug') slug: string) {
    return this.breedsService.findBySlug(slug);
  }

  @Get('featured')
  @Serialize(BreedResponseDto)
  getFeaturedBreeds() {
    return this.breedsService.getFeaturedBreeds();
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importBreeds(@UploadedFile() file: Express.Multer.File) {
    return this.breedsService.importFromCSV(file);
  }

  @Get(':id')
  @Serialize(BreedResponseDto)
  findOne(@Param('id') id: string) {
    return this.breedsService.findById(id);
  }

  @Patch(':id')
  // @UseGuards(LocalAuthGuard, ActiveUserGuard)
  @Serialize(BreedResponseDto)
  update(@Param('id') id: string, @Body() updateBreedDto: UpdateBreedDto) {
    return this.breedsService.update(id, updateBreedDto);
  }

  @Delete(':id')
  // @UseGuards(LocalAuthGuard, ActiveUserGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.breedsService.delete(id);
  }

  @Delete(':id/hard')
  // @UseGuards(LocalAuthGuard, ActiveUserGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  hardRemove(@Param('id') id: string) {
    return this.breedsService.hardDelete(id);
  }

  @Patch(':id/toggle-featured')
  // @UseGuards(LocalAuthGuard, ActiveUserGuard)
  toggleFeaturedStatus(@Param('id') id: string) {
    return this.breedsService.toggleFeaturedStatus(id);
  }
} 