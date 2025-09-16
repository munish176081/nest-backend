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
import { ListingAvailabilityEnum } from '../listings/entities/listing.entity';

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
    return req.user;
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
