import { Test, TestingModule } from '@nestjs/testing';
import { ListingAdOrdersController } from './listing-ad-orders.controller';
import { ListingAdOrdersService } from './listing-ad-orders.service';

describe('ListingAdOrdersController', () => {
  let controller: ListingAdOrdersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListingAdOrdersController],
      providers: [ListingAdOrdersService],
    }).compile();

    controller = module.get<ListingAdOrdersController>(ListingAdOrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
