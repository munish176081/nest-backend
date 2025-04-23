import { Controller } from '@nestjs/common';
import { ListingTypesService } from './listing-types.service';

@Controller('listing-types')
export class ListingTypesController {
  constructor(private readonly listingTypesService: ListingTypesService) {}
}
