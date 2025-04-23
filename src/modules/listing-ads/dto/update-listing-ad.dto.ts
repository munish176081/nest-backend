import { PartialType } from '@nestjs/mapped-types';
import { CreateListingAdDto } from './create-listing-ad.dto';

export class UpdateListingAdDto extends PartialType(CreateListingAdDto) {}
