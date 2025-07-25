import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ListingsService } from './listings.service';
import { CreateListingDto, UpdateListingDto, QueryListingDto, SearchListingDto } from './dto';
import { ListingResponseDto, ListingSummaryDto, PaginatedListingsResponseDto } from './dto/response-listing.dto';
import { LoggedInGuard } from '../../middleware/LoggedInGuard';
import { Serialize } from '../../transformers/serialize.interceptor';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  // Create new listing
  @UseGuards(LoggedInGuard)
  @Post()
  @Serialize(ListingResponseDto)
  async createListing(
    @Req() req: Request,
    @Body() createListingDto: CreateListingDto,
  ): Promise<ListingResponseDto> {
    return await this.listingsService.createListing(req.user.id, createListingDto);
  }

  // Update listing
  @UseGuards(LoggedInGuard)
  @Put(':id')
  @Serialize(ListingResponseDto)
  async updateListing(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateListingDto: UpdateListingDto,
  ): Promise<ListingResponseDto> {
    return await this.listingsService.updateListing(req.user.id, id, updateListingDto);
  }

  // Publish listing (change status from draft to active)
  @UseGuards(LoggedInGuard)
  @Post(':id/publish')
  @Serialize(ListingResponseDto)
  async publishListing(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ListingResponseDto> {
    return await this.listingsService.publishListing(req.user.id, id);
  }

  // Delete listing
  @UseGuards(LoggedInGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteListing(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.listingsService.deleteListing(req.user.id, id);
  }

  // Get listing by ID (public)
  @Get(':id')
  @Serialize(ListingResponseDto)
  async getListingById(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('incrementView') incrementView?: string,
  ): Promise<ListingResponseDto> {
    return await this.listingsService.getListingById(id, incrementView === 'true');
  }

  // Get user's listings
  @UseGuards(LoggedInGuard)
  @Get('my/listings')
  @Serialize(ListingSummaryDto)
  async getUserListings(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('includeExpired') includeExpired?: string,
    @Query('includeDrafts') includeDrafts?: string,
  ): Promise<ListingSummaryDto[]> {
    return await this.listingsService.getUserListings(req.user.id, {
      status: status as any,
      includeExpired: includeExpired === 'true',
      includeDrafts: includeDrafts === 'true',
    });
  }

  // Search listings (public)
  @Get('search')
  @Serialize(PaginatedListingsResponseDto)
  async searchListings(@Query() searchDto: SearchListingDto): Promise<PaginatedListingsResponseDto> {
    return await this.listingsService.searchListings(searchDto);
  }

  // Get listings with filters (public)
  @Get()
  @Serialize(PaginatedListingsResponseDto)
  async getListings(@Query() queryDto: QueryListingDto): Promise<PaginatedListingsResponseDto> {
    return await this.listingsService.getListings(queryDto);
  }

  // Get featured listings (public)
  @Get('featured')
  @Serialize(ListingSummaryDto)
  async getFeaturedListings(@Query('limit') limit?: string): Promise<ListingSummaryDto[]> {
    return await this.listingsService.getFeaturedListings(parseInt(limit) || 10);
  }

  // Get premium listings (public)
  @Get('premium')
  @Serialize(ListingSummaryDto)
  async getPremiumListings(@Query('limit') limit?: string): Promise<ListingSummaryDto[]> {
    return await this.listingsService.getPremiumListings(parseInt(limit) || 10);
  }

  // Increment favorite count
  @Post(':id/favorite')
  @HttpCode(HttpStatus.NO_CONTENT)
  async incrementFavoriteCount(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.listingsService.incrementFavoriteCount(id);
  }

  // Decrement favorite count
  @Delete(':id/favorite')
  @HttpCode(HttpStatus.NO_CONTENT)
  async decrementFavoriteCount(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.listingsService.decrementFavoriteCount(id);
  }

  // Increment contact count
  @Post(':id/contact')
  @HttpCode(HttpStatus.NO_CONTENT)
  async incrementContactCount(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.listingsService.incrementContactCount(id);
  }

  // Get listing statistics
  @UseGuards(LoggedInGuard)
  @Get('stats/my')
  async getMyListingStats(@Req() req: Request) {
    return await this.listingsService.getListingStats(req.user.id);
  }

  // Get global listing statistics (admin only)
  @Get('stats/global')
  async getGlobalListingStats() {
    return await this.listingsService.getListingStats();
  }
} 