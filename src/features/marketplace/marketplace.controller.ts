import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  ParseUUIDPipe,
  Get,
  ParseEnumPipe,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { Request } from 'express';
import { CheckoutListingDto } from './dto/checkout-listing.dto';
import { RenewListingDto } from './dto/renew-listing.dto';
import { ListingProductDto } from './dto/listing-product.dto';

import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { SearchListingDto, SearchListingQuery } from './dto/search-listing.dto';
import { ActiveUserGuard } from 'src/middleware/ActiveUserGuard';
import { ListingsService } from './marketplace.service';
import { ListingDto } from './dto/listing.dto';
import { Serialize } from 'src/transformers/serialize.interceptor';
import { ListingTypeEnum, listingTypes } from '../category-types/entities/listing-type.entity';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @UseGuards(ActiveUserGuard)
  @Serialize(ListingDto)
  @Post()
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: diskStorage({
        destination: './uploads', // where to store the files
        filename: (_req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(
            null,
            `${uniqueSuffix}-${file.originalname}`.replaceAll(' ', '-'),
          );
        },
      }),
      limits: {
        fileSize: 1 * 1024 * 1024, // 1 MB limit
        files: 10 * 20, // 20 puppies * 10 images per puppy
      },
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          return callback(
            new BadRequestException('Only image files are allowd!'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  create(
    @UploadedFiles() files: Express.Multer.File[],
    // TODO: add validation to fields
    @Body() createListingDto: any,
    @Req() req: Request,
  ) {
    if (!createListingDto.type) {
      throw new BadRequestException('Listing type is required');
    }

    const { type, fields } = createListingDto;

    return this.listingsService.create({
      type,
      fields,
      files,
      userId: req.user.id,
    });
  }

  @UseGuards(ActiveUserGuard)
  @Post(':id/checkout')
  checkout(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe({ version: '4' })) listingId: string,
    @Body() checkoutListingDto: CheckoutListingDto,
  ) {
    return this.listingsService.checkout({
      listingId,
      userId: req.user.id,
      durationInDays: checkoutListingDto.durationInDays,
      adId: checkoutListingDto.adId,
      adDurationInDays: checkoutListingDto.adDurationInDays,
      type: 'listing-checkout',
    });
  }

  @UseGuards(ActiveUserGuard)
  @Post(':id/renew')
  renew(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe({ version: '4' })) listingId: string,
    @Body() renewListingDto: RenewListingDto,
  ) {
    return this.listingsService.checkout({
      listingId,
      userId: req.user.id,
      durationInDays: renewListingDto.durationInDays,
      adId: renewListingDto.adId,
      adDurationInDays: renewListingDto.adDurationInDays,
      type: 'listing-renew',
    });
  }

  @Serialize(SearchListingDto)
  @Get('/search')
  search(@Query() query: SearchListingQuery) {
    return this.listingsService.searchListings(query);
  }

  @Serialize(ListingProductDto)
  @Get(':type/products')
  getListingTypeProducts(
    @Param('type', new ParseEnumPipe(listingTypes)) type: ListingTypeEnum,
  ) {
    return this.listingsService.getListingTypeProducts(type);
  }
}
