import { Test, TestingModule } from '@nestjs/testing';
import { ListingAdOrdersService } from './listing-ad-orders.service';

describe('ListingAdOrdersService', () => {
  let service: ListingAdOrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ListingAdOrdersService],
    }).compile();

    service = module.get<ListingAdOrdersService>(ListingAdOrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
