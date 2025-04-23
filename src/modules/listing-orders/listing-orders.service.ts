import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ListingOrder } from './entities/listing-order.entity';
import { EntityManager, In, Repository } from 'typeorm';
import { daysToMilliseconds } from 'src/utils/date';

@Injectable()
export class ListingOrdersService {
  constructor(
    @InjectRepository(ListingOrder)
    private readonly listingOrderRepo: Repository<ListingOrder>,
  ) {}

  findActiveByListingIds(listingIds: string[]) {
    return this.listingOrderRepo.find({
      where: {
        listingId: In(listingIds),
        status: 'active',
      },
    });
  }

  findActiveByListingId(listingId: string) {
    return this.listingOrderRepo.findOne({
      where: {
        listingId,
        status: 'active',
      },
    });
  }

  async createOrder(
    {
      listingId,
      durationInDays,
      price,
      payment,
      endsAt,
    }: {
      listingId: string;
      durationInDays: number;
      price: number;
      payment: string;
      endsAt?: Date;
    },
    manager?: EntityManager,
  ) {
    manager = manager ?? this.listingOrderRepo.manager;

    const listingOrder = manager.create(ListingOrder, {
      listingId,
      durationInDays,
      price,
      payment,
      status: 'active',
      startsAt: new Date(),
      endsAt:
        endsAt ?? new Date(Date.now() + daysToMilliseconds(durationInDays)),
    });

    return manager.save(listingOrder);
  }

  async renewsOrder(
    {
      listingId,
      durationInDays,
      price,
      payment,
    }: {
      listingId: string;
      durationInDays: number;
      price: number;
      payment: string;
    },
    manager?: EntityManager,
  ) {
    manager = manager ?? this.listingOrderRepo.manager;

    const listingOrder = await manager.findOne(ListingOrder, {
      where: {
        listingId,
        status: 'active',
      },
    });

    const newOrder = await this.createOrder(
      {
        listingId,
        durationInDays,
        price,
        payment,
        endsAt: new Date(
          (listingOrder?.endsAt || new Date()).getTime() +
            daysToMilliseconds(durationInDays),
        ),
      },
      manager,
    );

    if (listingOrder) {
      const { affected } = await manager.update(
        ListingOrder,
        {
          id: listingOrder.id,
          status: 'active',
        },
        {
          status: 'finished',
          renewedByOrderId: newOrder.id,
        },
      );

      if (affected === 0) {
        console.log('Failed to update previous order status', {
          listingOrderId: listingOrder.id,
          renewedByOrderId: newOrder.id,
        });
      }
    }

    return newOrder;
  }
}
