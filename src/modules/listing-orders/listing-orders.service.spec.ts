import { Test, TestingModule } from '@nestjs/testing';
import { ListingOrdersService } from './listing-orders.service';

describe('ListingOrdersService', () => {
  let service: ListingOrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ListingOrdersService],
    }).compile();

    service = module.get<ListingOrdersService>(ListingOrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
