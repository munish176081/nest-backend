import { PartialType } from '@nestjs/mapped-types';
import { CreateBreedTypeImageDto } from './create-breed-type-image.dto';

export class UpdateBreedTypeImageDto extends PartialType(CreateBreedTypeImageDto) {}
