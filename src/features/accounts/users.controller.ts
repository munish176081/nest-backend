import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
  Post,
  Body,
  Delete,
  Put,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { UserDto } from './dto/user.dto';
import { UserListings } from './dto/listings.dto';
import { UsersService } from './users.service';
import { ListingsService } from '../listings/listings.service';
import { LoggedInGuard } from 'src/middleware/LoggedInGuard';
import { Serialize } from 'src/transformers/serialize.interceptor';
import { CreateListingDto } from '../listings/dto/create-listing.dto';
import { ListingResponseDto, ListingSummaryDto } from '../listings/dto/response-listing.dto';
import { UpdateListingDto } from '../listings/dto/update-listing.dto';
import { ListingAvailabilityEnum, ListingStatusEnum } from '../listings/entities/listing.entity';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly listingsService: ListingsService,
    private readonly usersService: UsersService,
  ) {}

  @UseGuards(LoggedInGuard)
  @Serialize(UserDto)
  @Get('me')
  async findCurrenUser(@Req() req: Request) {
    // Fetch complete user data from database to include new profile fields
    return await this.usersService.getUserById(req.user.id);
  }

  @Serialize(UserDto)
  @Get('profile/:username')
  async getUserProfile(@Param('username') username: string) {
    return await this.usersService.getUserByUsername(username);
  }

  @Get(':username/listings')
  async getPublicUserListings(@Param('username') username: string) {
    const user = await this.usersService.getUserByUsername(username);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // Get all active listings for this user
    const listings = await this.listingsService.getUserListings(user.id, {
      status: ListingStatusEnum.ACTIVE,
      includeExpired: false,
      includeDrafts: false
    });
    
    console.log('🔍 Debug - User ID:', user.id);
    console.log('🔍 Debug - Total listings found:', listings.length);
    console.log('🔍 Debug - Listing types:', listings.map(l => l.type));
    console.log('🔍 Debug - PUPPY_LITTER_LISTING listLitterOptions:', 
      listings
        .filter(l => l.type === 'PUPPY_LITTER_LISTING')
        .map(l => ({ id: l.id, listLitterOption: l.fields?.listLitterOption }))
    );
    
    // Group listings by type
    const groupedListings = {
      puppies: listings.filter(listing => {
        // Include PUPPY_LISTING and PUPPY_LITTER_LISTING with single-puppy option
        if (listing.type === 'PUPPY_LISTING') return true;
        if (listing.type === 'PUPPY_LITTER_LISTING') {
          const listLitterOption = listing.fields?.listLitterOption;
          return listLitterOption === 'single-puppy';
        }
        return false;
      }),
      litters: listings.filter(listing => {
        // Include PUPPY_LITTER_LISTING with litter options (same-details or add-individually)
        if (listing.type === 'PUPPY_LITTER_LISTING') {
          const listLitterOption = listing.fields?.listLitterOption;
          return listLitterOption === 'same-details' || listLitterOption === 'add-individually';
        }
        // Include FUTURE_LISTING (future litters)
        if (listing.type === 'FUTURE_LISTING') {
          return true;
        }
        return false;
      }),
      stud: listings.filter(listing => listing.type === 'STUD_LISTING'),
      semen: listings.filter(listing => listing.type === 'SEMEN_LISTING'),
      wanted: listings.filter(listing => listing.type === 'WANTED_LISTING'),
      services: listings.filter(listing => listing.type === 'OTHER_SERVICES')
    };
    
    console.log('🔍 Debug - Grouped listings:', {
      puppies: groupedListings.puppies.length,
      litters: groupedListings.litters.length,
      stud: groupedListings.stud.length,
      semen: groupedListings.semen.length,
      wanted: groupedListings.wanted.length,
      services: groupedListings.services.length
    });
    
    return groupedListings;
  }

  @UseGuards(LoggedInGuard)
  @Serialize(UserDto)
  @Put('me')
  async updateUserProfile(
    @Req() req: Request,
    @Body() updateUserProfileDto: UpdateUserProfileDto,
  ) {
    return await this.usersService.updateUserProfile(req.user.id, updateUserProfileDto);
  }

  @UseGuards(LoggedInGuard)
  @Serialize(ListingSummaryDto)
  @Get('/listings')
  async getUserListings(@Req() req: Request) {
    const listings = await this.listingsService.getUserListings(req.user.id, {
      includeDrafts: true,
      includeExpired: true
    });
    return listings;
  }

  @UseGuards(LoggedInGuard)
  @Serialize(ListingResponseDto)
  @Post('/listings')
  async createListing(
    @Req() req: Request,
    @Body() createListingDto: CreateListingDto,
  ) {
    return await this.listingsService.createListing(createListingDto, req.user.id);
  }

  @UseGuards(LoggedInGuard)
  @Serialize(ListingResponseDto)
  @Post('/listings/:id/publish')
  async publishListing(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return await this.listingsService.publishListing(req.user.id, id);
  }

  @UseGuards(LoggedInGuard)
  @Serialize(ListingResponseDto)
  @Put('/listings/:id')
  async updateListing(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateListingDto: UpdateListingDto,
  ) {
    return await this.listingsService.updateListing(req.user.id, id, updateListingDto);
  }

  @UseGuards(LoggedInGuard)
  @Serialize(ListingResponseDto)
  @Put('/listings/:id/availability')
  async updateListingAvailability(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: { availability: ListingAvailabilityEnum },
  ) {
    return await this.listingsService.updateAvailability(req.user.id, id, body.availability);
  }

  @UseGuards(LoggedInGuard)
  @Delete('/listings/:id')
  async deleteListing(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return await this.listingsService.deleteListing(req.user.id, id);
  }

  @UseGuards(LoggedInGuard)
  @Serialize(ListingResponseDto)
  @Get('/listings/:id')
  async getUserListing(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const listing = await this.listingsService.getListingById(id, false, req.user.id);
    return listing;
  }

  // Test endpoint to manually trigger session refresh
  @UseGuards(LoggedInGuard)
  @Post('/refresh-session')
  async refreshSession(@Req() req: Request) {
    const user = await this.usersService.validateAndGetUser(req.user.email);
    return { message: 'Session refreshed', user: req.user };
  }

  // Migration endpoint - should be removed after migration is complete
  @Post('/migrate-users')
  async migrateUsers() {
    await this.usersService.migrateExistingUsers();
    return { message: 'User migration completed' };
  }

  // Debug endpoint to check current user status
  @Get('/debug/me')
  @UseGuards(LoggedInGuard)
  async getCurrentUserDebug(@Req() req: Request) {
    return {
      message: 'Current user debug info (no admin check)',
      user: req.user,
      isAuthenticated: req.isAuthenticated(),
      session: req.session,
      headers: {
        authorization: req.headers.authorization,
        cookie: req.headers.cookie,
      }
    };
  }
}
