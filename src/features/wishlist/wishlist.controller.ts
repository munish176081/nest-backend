import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { LoggedInGuard } from '../../middleware/LoggedInGuard';
import { AddToWishlistDto } from './dto';

@Controller('wishlist')
@UseGuards(LoggedInGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post()
  async addToWishlist(@Body() addToWishlistDto: AddToWishlistDto, @Request() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    return this.wishlistService.addToWishlist(userId, addToWishlistDto);
  }

  @Delete(':listingId')
  async removeFromWishlist(@Param('listingId') listingId: string, @Request() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    await this.wishlistService.removeFromWishlist(userId, listingId);
    return { message: 'Removed from wishlist successfully' };
  }

  @Get()
  async getUserWishlist(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Request() req,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;

    return this.wishlistService.getUserWishlist(userId, pageNum, limitNum);
  }

  @Get('status')
  async getWishlistStatus(
    @Query('listingIds') listingIds: string,
    @Request() req,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    if (!listingIds) {
      return [];
    }

    const listingIdsArray = listingIds.split(',').filter(id => id.trim());
    return this.wishlistService.getWishlistStatus(userId, listingIdsArray);
  }

  @Get('check/:listingId')
  async checkWishlistStatus(@Param('listingId') listingId: string, @Request() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    const isWishlisted = await this.wishlistService.isInWishlist(userId, listingId);
    return { isWishlisted };
  }
}
