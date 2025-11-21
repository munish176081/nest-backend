import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from "typeorm";

export class CreateSubscriptionsTable1756549000000 implements MigrationInterface {
    name = 'CreateSubscriptionsTable1756549000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'subscriptions',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'user_id',
                        type: 'uuid',
                    },
                    {
                        name: 'listing_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'subscriptionId',
                        type: 'varchar',
                        length: '255',
                        isUnique: true,
                    },
                    {
                        name: 'paymentMethod',
                        type: 'enum',
                        enum: ['stripe', 'paypal'],
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['active', 'cancelled', 'expired', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid'],
                        default: "'active'",
                    },
                    {
                        name: 'current_period_start',
                        type: 'timestamptz',
                    },
                    {
                        name: 'current_period_end',
                        type: 'timestamptz',
                    },
                    {
                        name: 'cancel_at_period_end',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'canceled_at',
                        type: 'timestamptz',
                        isNullable: true,
                    },
                    {
                        name: 'amount',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                    },
                    {
                        name: 'currency',
                        type: 'varchar',
                        length: '3',
                        default: "'AUD'",
                    },
                    {
                        name: 'listing_type',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'includes_featured',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'metadata',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamptz',
                        default: 'now()',
                    },
                    {
                        name: 'updatedAt',
                        type: 'timestamptz',
                        default: 'now()',
                    },
                ],
            }),
            true
        );

        // Create indexes
        await queryRunner.createIndex(
            'subscriptions',
            new TableIndex({
                name: 'idx_subscriptions_user_id',
                columnNames: ['user_id']
            })
        );

        await queryRunner.createIndex(
            'subscriptions',
            new TableIndex({
                name: 'idx_subscriptions_listing_id',
                columnNames: ['listing_id']
            })
        );

        await queryRunner.createIndex(
            'subscriptions',
            new TableIndex({
                name: 'idx_subscriptions_subscription_id',
                columnNames: ['subscriptionId']
            })
        );

        await queryRunner.createIndex(
            'subscriptions',
            new TableIndex({
                name: 'idx_subscriptions_status',
                columnNames: ['status']
            })
        );

        await queryRunner.createIndex(
            'subscriptions',
            new TableIndex({
                name: 'idx_subscriptions_current_period_end',
                columnNames: ['current_period_end']
            })
        );

        // Add foreign key constraints
        await queryRunner.createForeignKey(
            'subscriptions',
            new TableForeignKey({
                columnNames: ['user_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'CASCADE',
                name: 'FK_subscriptions_user_id'
            })
        );

        await queryRunner.createForeignKey(
            'subscriptions',
            new TableForeignKey({
                columnNames: ['listing_id'],
                referencedColumnNames: ['id'],
                referencedTableName: 'listings',
                onDelete: 'SET NULL',
                name: 'FK_subscriptions_listing_id'
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.dropForeignKey('subscriptions', 'FK_subscriptions_listing_id');
        await queryRunner.dropForeignKey('subscriptions', 'FK_subscriptions_user_id');

        // Drop indexes
        await queryRunner.dropIndex('subscriptions', 'idx_subscriptions_current_period_end');
        await queryRunner.dropIndex('subscriptions', 'idx_subscriptions_status');
        await queryRunner.dropIndex('subscriptions', 'idx_subscriptions_subscription_id');
        await queryRunner.dropIndex('subscriptions', 'idx_subscriptions_listing_id');
        await queryRunner.dropIndex('subscriptions', 'idx_subscriptions_user_id');

        // Drop table
        await queryRunner.dropTable('subscriptions');
    }
}

