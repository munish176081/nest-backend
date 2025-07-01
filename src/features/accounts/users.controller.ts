import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
  Post,
} from '@nestjs/common';
import { Request } from 'express';
import { UserDto } from './dto/user.dto';
import { UserListings } from './dto/listings.dto';
import { UsersService } from './users.service';
// import { ListingsService } from '../marketplace/marketplace.service';
import { LoggedInGuard } from 'src/middleware/LoggedInGuard';
import { Serialize } from 'src/transformers/serialize.interceptor';

@Controller('users')
export class UsersController {
  constructor(
    // private readonly listingsService: ListingsService,
    private readonly usersService: UsersService,
  ) {}

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
    // const listings = await this.listingsService.getUserListings(req.user.id);

    // return listings;
  }

  @UseGuards(LoggedInGuard)
  @Serialize(UserListings)
  @Get('/listings/:id')
  async getUserListing(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    // const listing = await this.listingsService.getUserListing(req.user.id, id);

    // return listing;
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
}
