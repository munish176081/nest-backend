import { Test, TestingModule } from '@nestjs/testing';
import { ListingAdsService } from './listing-ads.service';

describe('ListingAdsService', () => {
  let service: ListingAdsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ListingAdsService],
    }).compile();

    service = module.get<ListingAdsService>(ListingAdsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
