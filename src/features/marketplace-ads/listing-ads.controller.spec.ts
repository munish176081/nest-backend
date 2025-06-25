import { Test, TestingModule } from '@nestjs/testing';
import { ListingAdsController } from './listing-ads.controller';
import { ListingAdsService } from './listing-ads.service';

describe('ListingAdsController', () => {
  let controller: ListingAdsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListingAdsController],
      providers: [ListingAdsService],
    }).compile();

    controller = module.get<ListingAdsController>(ListingAdsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
