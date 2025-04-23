import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Serialize } from 'src/interceptors/serialize.interceptor';
import { UserDto } from './dto/user.dto';
import { LoggedInGuard } from 'src/guards/LoggedInGuard';
import { ListingsService } from '../listings/listings.service';
import { UserListings } from './dto/listings.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly listingsService: ListingsService) {}

  @UseGuards(LoggedInGuard)
  @Serialize(UserDto)
  @Get('me')
  async findCurrenUser(@Req() req: Request) {
    return req.user;
  }

  @UseGuards(LoggedInGuard)
  @Serialize(UserListings)
  @Get('/listings')
  async getUserListings(@Req() req: Request) {
    const listings = await this.listingsService.getUserListings(req.user.id);

    return listings;
  }

  @UseGuards(LoggedInGuard)
  @Serialize(UserListings)
  @Get('/listings/:id')
  async getUserListing(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const listing = await this.listingsService.getUserListing(req.user.id, id);

    return listing;
  }
}
