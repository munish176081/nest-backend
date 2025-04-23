import { Controller } from '@nestjs/common';
import { ListingAdOrdersService } from './listing-ad-orders.service';

@Controller('listing-ad-orders')
export class ListingAdOrdersController {
  constructor(private readonly listingAdOrdersService: ListingAdOrdersService) {}
}
