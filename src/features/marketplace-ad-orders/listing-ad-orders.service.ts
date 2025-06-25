import { Injectable } from '@nestjs/common';
import { ListingAdOrder } from './entities/listing-ad-order.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { daysToMilliseconds } from 'src/helpers/date';

@Injectable()
export class ListingAdOrdersService {
  constructor(
    @InjectRepository(ListingAdOrder)
    private readonly listingAdOrderRepo: Repository<ListingAdOrder>,
  ) {}

  async createOrder(
    {
      listingAdId,
      listingId,
      durationInDays,
      price,
      payment,
      endsAt,
    }: {
      listingAdId: number;
      listingId: string;
      durationInDays: number;
      price: number;
      payment: string;
      endsAt?: Date;
    },
    manager?: EntityManager,
  ) {
    manager = manager ?? this.listingAdOrderRepo.manager;

    const listingOrder = manager.create(ListingAdOrder, {
      listingAdId,
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
      listingAdId,
      listingId,
      durationInDays,
      price,
      payment,
    }: {
      listingAdId: number;
      listingId: string;
      durationInDays: number;
      price: number;
      payment: string;
    },
    manager?: EntityManager,
  ) {
    manager = manager ?? this.listingAdOrderRepo.manager;

    const listingAdOrder = await manager.findOne(ListingAdOrder, {
      where: {
        listingId,
        status: 'active',
      },
    });

    const newOrder = await this.createOrder(
      {
        listingAdId,
        listingId,
        durationInDays,
        price,
        payment,
        endsAt: new Date(
          (listingAdOrder?.endsAt || new Date()).getTime() +
            daysToMilliseconds(durationInDays),
        ),
      },
      manager,
    );

    if (listingAdOrder) {
      const { affected } = await manager.update(
        ListingAdOrder,
        {
          id: listingAdOrder.id,
          status: 'active',
        },
        {
          status: 'finished',
          renewedByOrderId: newOrder.id,
        },
      );

      if (affected === 0) {
        console.log('Failed to update previous ad order status', {
          listingAdOrderId: listingAdOrder.id,
          renewedByOrderId: newOrder.id,
        });
      }
    }

    return newOrder;
  }
}
