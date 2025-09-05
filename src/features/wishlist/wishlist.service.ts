import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { AddToWishlistDto, WishlistResponseDto, WishlistStatusDto } from './dto';
import { ListingsService } from '../listings/listings.service';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(Wishlist)
    private wishlistRepository: Repository<Wishlist>,
    private listingsService: ListingsService,
  ) {}

  async addToWishlist(userId: string, addToWishlistDto: AddToWishlistDto): Promise<WishlistResponseDto> {
    const { listingId } = addToWishlistDto;

    // Check if listing exists
    const listing = await this.listingsService.getListingById(listingId);
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Check if user is trying to add their own listing
    if (listing.userId === userId) {
      throw new BadRequestException('Cannot add your own listing to wishlist');
    }

    // Check if already in wishlist
    const existingWishlist = await this.wishlistRepository.findOne({
      where: { userId, listingId }
    });

    if (existingWishlist) {
      throw new BadRequestException('Listing already in wishlist');
    }

    // Add to wishlist
    const wishlist = this.wishlistRepository.create({
      userId,
      listingId,
    });

    const savedWishlist = await this.wishlistRepository.save(wishlist);

    return {
      id: savedWishlist.id,
      userId: savedWishlist.userId,
      listingId: savedWishlist.listingId,
      createdAt: savedWishlist.createdAt,
      listing: {
        id: listing.id,
        title: listing.title,
        price: listing.price,
        breed: listing.breed,
        location: listing.location,
        imageUrl: listing.fields?.imageUrl || listing.fields?.images?.[0],
      },
    };
  }

  async removeFromWishlist(userId: string, listingId: string): Promise<void> {
    const wishlist = await this.wishlistRepository.findOne({
      where: { userId, listingId }
    });

    if (!wishlist) {
      throw new NotFoundException('Listing not found in wishlist');
    }

    await this.wishlistRepository.remove(wishlist);
  }

  async getUserWishlist(userId: string, page: number = 1, limit: number = 20): Promise<{
    items: WishlistResponseDto[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    const [wishlistItems, total] = await this.wishlistRepository.findAndCount({
      where: { userId },
      relations: ['listing'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const items = wishlistItems.map(item => ({
      id: item.id,
      userId: item.userId,
      listingId: item.listingId,
      createdAt: item.createdAt,
      listing: {
        id: item.listing.id,
        title: item.listing.title,
        price: item.listing.price,
        breed: item.listing.breed,
        location: item.listing.location,
        imageUrl: item.listing.fields?.imageUrl || item.listing.fields?.images?.[0],
      },
    }));

    return {
      items,
      total,
      page,
      limit,
      hasMore: (page * limit) < total,
    };
  }

  async getWishlistStatus(userId: string, listingIds: string[]): Promise<WishlistStatusDto[]> {
    if (listingIds.length === 0) {
      return [];
    }

    const wishlistItems = await this.wishlistRepository.find({
      where: {
        userId,
        listingId: In(listingIds),
      },
      select: ['listingId'],
    });

    const wishlistedIds = new Set(wishlistItems.map(item => item.listingId));

    return listingIds.map(listingId => ({
      listingId,
      isWishlisted: wishlistedIds.has(listingId),
    }));
  }

  async isInWishlist(userId: string, listingId: string): Promise<boolean> {
    const wishlist = await this.wishlistRepository.findOne({
      where: { userId, listingId }
    });

    return !!wishlist;
  }
}
