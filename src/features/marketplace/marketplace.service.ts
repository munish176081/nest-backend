import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as R from 'remeda';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { PaymentService } from '../payment/payment.service';
import { config } from 'src/config/config';

import { ConfigService } from '@nestjs/config';

import { SearchListingQuery } from './dto/search-listing.dto';
import { Listing, ListingStatusEnum } from './entities/product.entity';
import { ListingOrdersService } from '../marketplace-orders/listing-orders.service';
import { ListingTypesService } from '../category-types/listing-types.service';
import { ListingAdsService } from '../marketplace-ads/listing-ads.service';
import { ListingAdOrdersService } from '../marketplace-ad-orders/listing-ad-orders.service';
import { ListingTypeEnum } from '../category-types/entities/listing-type.entity';
import { extractMulterFiles } from 'src/helpers/extractMulterFiles';

const SEARCH_LISTING_LOCATION_RADIUS = 50_000; // 50 kilometer;

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    private readonly configService: ConfigService,
    private readonly paymentService: PaymentService,
    private readonly listingOrdersService: ListingOrdersService,
    private readonly listingTypesService: ListingTypesService,
    private readonly listingAdsService: ListingAdsService,
    private readonly listingAdOrdersService: ListingAdOrdersService,
  ) {}

  async searchListings(searchQuery: SearchListingQuery) {
    const { types, breed, minPrice, maxPrice, location } = searchQuery;

    const query = this.listingRepo
      .createQueryBuilder('listing')
      .where('listing.status = :status', { status: 'active' });

    if (minPrice) {
      query.andWhere('listing.price >= :price', { price: minPrice });
    }

    if (maxPrice) {
      query.andWhere('listing.price >= :price', { price: maxPrice });
    }

    if (breed) {
      query.andWhere('listing.breed = :breed', { breed });
    }

    if (types && types.length > 0) {
      query.andWhere('listing.type IN (:...types)', { types });
    }

    if (location) {
      query.andWhere(
        `ST_DWithin(listing.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius)`,
        {
          lng: location.lng,
          lat: location.lat,
          radius: SEARCH_LISTING_LOCATION_RADIUS,
        },
      );
    }

    query.orderBy('created_at', 'DESC');

    const listings = await query.getMany();

    return listings;
  }

  async getUserListings(userId: string) {
    const listings = await this.listingRepo.find({
      where: { userId },
    });

    const listingIds = listings.map((listing) => listing.id);

    const orders =
      await this.listingOrdersService.findActiveByListingIds(listingIds);

    const listingIdToOrderMap = new Map(
      orders.map((order) => [order.listingId, order]),
    );

    const decoratedListings = listings.map((listing) => {
      const order = listingIdToOrderMap.get(listing.id);

      return {
        ...listing,
        expiresAt: order?.endsAt,
        startedOrRenewedAt: order?.startsAt,
      };
    });

    return decoratedListings;
  }

  async getUserListing(userId: string, listingId: string) {
    const listing = await this.listingRepo.findOne({
      where: { userId, id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const order = await this.listingOrdersService.findActiveByListingId(
      listing.id,
    );

    return {
      ...listing,
      expiresAt: order?.endsAt,
      startedOrRenewedAt: order?.startsAt,
    };
  }

  create({
    fields,
    type,
    files,
    userId,
  }: {
    fields: any;
    files: Express.Multer.File[];
    type: ListingTypeEnum;
    userId?: string;
  }) {
    const updatedFields = this.validateAndGetListingData({
      fields,
      type,
      files,
    });

    const { breed, price, contactDetails } = updatedFields;
    const { location } = contactDetails ?? {};
    const { lat, lng } = location ?? {};

    const listing = this.listingRepo.create({
      fields: updatedFields,
      breed,
      price,
      ...(location && {
        location: {
          type: 'Point',
          coordinates: [lng, lat],
        },
      }),
      type,
      userId,
      status: 'draft',
    });

    return this.listingRepo.save(listing);
  }

  async checkout({
    listingId,
    userId,
    durationInDays,
    adId,
    adDurationInDays,
    type = 'listing-checkout',
  }: {
    listingId: string;
    userId: string;
    durationInDays: number;
    adId?: number;
    adDurationInDays?: number;
    type: 'listing-checkout' | 'listing-renew';
  }) {
    const listing = await this.listingRepo.findOne({
      where: { id: listingId, userId },
      relations: {
        listingType: true,
      },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (
      type === 'listing-checkout' &&
      listing.status !== 'draft' &&
      listing.status !== 'expired'
    ) {
      throw new BadRequestException(
        'Cannot checkout listing that is not draft',
      );
    }

    if (listing.status !== 'active' && type === 'listing-renew') {
      throw new BadRequestException('Cannot renew listing that is not active');
    }

    if (adDurationInDays && adDurationInDays > durationInDays) {
      throw new BadRequestException(
        'Ad duration should not be greater than listing duration',
      );
    }

    const listingProduct = await this.getListingProduct(
      listing,
      durationInDays,
    );
    const adProduct = await this.getAdProduct(adId, adDurationInDays);

    const checkoutProducts = [
      listingProduct,
      ...(adProduct ? [adProduct] : []),
    ];

    const metadata = {
      type,
      listingId: listing.id,
      durationInDays,
      price: listingProduct.price,
      ...(adProduct && {
        adId,
        adDurationInDays,
        adPrice: adProduct.price,
      }),
    };

    const session = await this.paymentService.createCheckoutSession({
      products: checkoutProducts,
      provider: 'stripe',
      successUrl: `${this.configService.get('siteUrl')}/account/listings/${listing.id}`,
      cancelUrl: `${this.configService.get('siteUrl')}/account/listings/${listing.id}`,
      metadata,
    });

    return { checkoutUrl: session.url };
  }

  async renewListing({
    listingId,
    durationInDays,
    price,
    payment,
    adId,
    adDurationInDays,
    adPrice,
  }: {
    listingId: string;
    durationInDays: number;
    price: number;
    payment: string;
    adId?: number;
    adDurationInDays?: number;
    adPrice?: number;
  }) {
    try {
      await this.listingRepo.manager.transaction(async (manager) => {
        const listing = await manager.findOne(Listing, {
          where: { id: listingId },
        });

        if (!listing) {
          throw new NotFoundException('Listing not found');
        }

        if (listing.status !== 'active') {
          console.log(
            'Listing is not active but recieved renew request. Still marking it as active to process the order',
          );

          await this.updateListingStatus(
            {
              listing,
              from: listing.status,
              to: 'active',
            },
            manager,
          );
        }

        await this.listingOrdersService.renewsOrder(
          {
            listingId,
            durationInDays,
            price,
            payment,
          },
          manager,
        );

        if (adId && adDurationInDays && adPrice) {
          await this.listingAdOrdersService.renewsOrder(
            {
              listingAdId: adId,
              listingId,
              durationInDays: adDurationInDays,
              price: adPrice,
              payment,
            },
            manager,
          );
        }
      });
    } catch (err) {
      console.log('Failed to start listing', err);
      throw err;
    }
  }

  async startListing({
    listingId,
    durationInDays,
    price,
    payment,
    adId,
    adDurationInDays,
    adPrice,
  }: {
    listingId: string;
    durationInDays: number;
    price: number;
    payment: string;
    adId?: number;
    adDurationInDays?: number;
    adPrice?: number;
  }) {
    try {
      await this.listingRepo.manager.transaction(async (manager) => {
        await this.updateListingStatus(
          {
            listingId,
            from: ['draft', 'expired'],
            to: 'active',
          },
          manager,
        );

        await this.listingOrdersService.createOrder(
          {
            listingId,
            durationInDays,
            price,
            payment,
          },
          manager,
        );

        if (adId && adDurationInDays && adPrice) {
          await this.listingAdOrdersService.createOrder(
            {
              listingAdId: adId,
              listingId,
              durationInDays: adDurationInDays,
              price: adPrice,
              payment,
            },
            manager,
          );
        }
      });
    } catch (err) {
      console.log('Failed to start listing', err);
      throw err;
    }
  }

  getListingTypeProducts(type: ListingTypeEnum) {
    return this.listingTypesService.findByType(type);
  }

  private validateAndGetPuppyListingData(
    fields: any,
    files: Express.Multer.File[],
  ) {
    // TODO: validate listing data

    const puppies = fields.puppies;

    files.forEach((file) => {
      // Extract the puppy index and images index from fieldname
      const match = file.fieldname.match(/puppies\[(\d+)\]\[images\]\[(\d+)\]/);

      if (match) {
        const puppyIndex = parseInt(match[1], 10);
        const imageIndex = parseInt(match[2], 10);

        if (!puppies[puppyIndex].images) {
          puppies[puppyIndex].images = [];
        }

        puppies[puppyIndex].images[imageIndex] =
          `${this.configService.get('apiUrl')}/${file.path}`;
      }
    });

    fields.puppies = puppies;

    return fields;
  }

  private validateAndGetSemenListingData(
    fields: any,
    files: Express.Multer.File[],
  ) {
    // TODO: validate listing data

    const extractedFiles = extractMulterFiles(
      files,
      this.configService.get('apiUrl'),
    );

    fields = R.mergeDeep(fields, extractedFiles);

    return fields;
  }

  private validateAndGetStudBitchListingData(
    fields: any,
    files: Express.Multer.File[],
  ) {
    // TODO: validate listing data

    const extractedFiles = extractMulterFiles(
      files,
      this.configService.get('apiUrl'),
    );

    fields = R.mergeDeep(fields, extractedFiles);

    return fields;
  }

  private validateAndGetFutureListingData(
    fields: any,
    files: Express.Multer.File[],
  ) {
    // TODO: validate listing data

    const extractedFiles = extractMulterFiles(
      files,
      this.configService.get('apiUrl'),
    );

    fields = R.mergeDeep(fields, extractedFiles);

    return fields;
  }

  private validateAndGetWantedPuppyListingData(
    fields: any,
    files: Express.Multer.File[],
  ) {
    // TODO: validate listing data

    const extractedFiles = extractMulterFiles(
      files,
      this.configService.get('apiUrl'),
    );

    fields = R.mergeDeep(fields, extractedFiles);

    return fields;
  }

  private validateAndGetOtherListingData(
    fields: any,
    files: Express.Multer.File[],
  ) {
    // TODO: validate listing data

    const extractedFiles = extractMulterFiles(
      files,
      this.configService.get('apiUrl'),
    );

    fields = R.mergeDeep(fields, extractedFiles);

    return fields;
  }

  private validateAndGetListingData({
    fields,
    type,
    files,
  }: {
    fields: any;
    files: Express.Multer.File[];
    type: ListingTypeEnum;
  }) {
    // TODO: validate listing data

    switch (type) {
      case 'puppy':
        return this.validateAndGetPuppyListingData(fields, files);
      case 'semen':
        return this.validateAndGetSemenListingData(fields, files);
      case 'stud_bitch':
        return this.validateAndGetStudBitchListingData(fields, files);
      case 'future':
        return this.validateAndGetFutureListingData(fields, files);
      case 'wanted_puppy':
        return this.validateAndGetWantedPuppyListingData(fields, files);
      case 'other':
        return this.validateAndGetOtherListingData(fields, files);
      default:
        throw new BadRequestException('Invalid listing type');
    }
  }

  private async getListingProduct(listing: Listing, durationInDays: number) {
    const listingProducts = listing.listingType.products;

    const product = listingProducts.find(
      (product) => product.durationInDays === durationInDays,
    );

    if (!product) {
      throw new BadRequestException(
        `Duration ${durationInDays} days is not supported`,
      );
    }

    const title = product.title ?? listing.listingType.title;
    const description = product.description ?? listing.listingType.description;
    const imageUrls = product.imageUrls ?? listing.listingType.imageUrls;

    return {
      price: product.price,
      currency: config.defaultPaymentCurrency,
      ...(title && { title }),
      ...(description && { description }),
      ...(imageUrls && imageUrls.length > 0 && { imageUrls }),
    };
  }

  private async getAdProduct(adId: number, adDurationInDays: number) {
    const isWithAd = adId && adDurationInDays;

    if (!isWithAd) return null;

    const ad = await this.listingAdsService.findById(adId);

    if (!ad) {
      throw new NotFoundException(`Ad with id ${adId} not found`);
    }

    const adProduct = ad.products.find(
      (product) => product.durationInDays === adDurationInDays,
    );

    if (!adProduct) {
      throw new BadRequestException(
        `Ad duration ${adDurationInDays} days is not supported`,
      );
    }

    const adTitle = ad.title ?? adProduct.title;
    const adDescription = ad.description ?? adProduct.description;
    const adImageUrls = adProduct.imageUrls;

    return {
      price: adProduct.price,
      currency: config.defaultPaymentCurrency,
      ...(adTitle && { title: adTitle }),
      ...(adDescription && { description: adDescription }),
      ...(adImageUrls && adImageUrls.length > 0 && { imageUrls: adImageUrls }),
    };
  }

  private async updateListingStatus(
    {
      listing,
      from,
      to,
    }: {
      listing: Listing;
      from: ListingStatusEnum | ListingStatusEnum[];
      to: ListingStatusEnum;
    },
    manager?: EntityManager,
  ): Promise<Listing>;
  private async updateListingStatus(
    {
      listingId,
      from,
      to,
    }: {
      listingId: string;
      from: ListingStatusEnum | ListingStatusEnum[];
      to: ListingStatusEnum;
    },
    manager?: EntityManager,
  ): Promise<Listing>;
  private async updateListingStatus(
    {
      listing,
      listingId,
      from,
      to,
    }: {
      listing?: Listing;
      listingId?: string;
      from: ListingStatusEnum | ListingStatusEnum[];
      to: ListingStatusEnum;
    },
    manager?: EntityManager,
  ) {
    if (!listing && !listingId) {
      throw new BadRequestException(
        'Listing or listingId is required to update listing status',
      );
    }

    manager = manager ?? this.listingRepo.manager;

    listing =
      listing ??
      (await manager.findOne(Listing, {
        where: { id: listingId },
      }));

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (![from].flat().includes(listing.status)) {
      throw new BadRequestException(
        `Listing is not in ${from.toString()} status, so it can't be updated to ${to}`,
      );
    }

    const { affected } = await manager.update(
      Listing,
      { id: listingId, status: Array.isArray(from) ? In(from) : from },
      { status: to },
    );

    if (affected === 0) {
      throw new ConflictException(`Failed to update listing status to ${to}`);
    }

    listing.status = to;
    return listing;
  }
}
