import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateActivityLogsTable1756545000000 implements MigrationInterface {
    name = 'CreateActivityLogsTable1756545000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'activity_logs',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'type',
                        type: 'varchar',
                        length: '50',
                    },
                    {
                        name: 'level',
                        type: 'varchar',
                        length: '20',
                    },
                    {
                        name: 'action',
                        type: 'varchar',
                        length: '255',
                    },
                    {
                        name: 'description',
                        type: 'text',
                    },
                    {
                        name: 'metadata',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'ipAddress',
                        type: 'varchar',
                        length: '45',
                        isNullable: true,
                    },
                    {
                        name: 'userAgent',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'resourceId',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'resourceType',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'actorId',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'actorEmail',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'actorRole',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                    },
                    {
                        name: 'targetId',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'targetEmail',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'targetType',
                        type: 'varchar',
                        length: '100',
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
            'activity_logs',
            new TableIndex({
                name: 'IDX_activity_logs_type_level',
                columnNames: ['type', 'level']
            })
        );

        await queryRunner.createIndex(
            'activity_logs',
            new TableIndex({
                name: 'IDX_activity_logs_actor_created',
                columnNames: ['actorId', 'createdAt']
            })
        );

        await queryRunner.createIndex(
            'activity_logs',
            new TableIndex({
                name: 'IDX_activity_logs_resource',
                columnNames: ['resourceType', 'resourceId']
            })
        );

        await queryRunner.createIndex(
            'activity_logs',
            new TableIndex({
                name: 'IDX_activity_logs_created_at',
                columnNames: ['createdAt']
            })
        );

        // Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "activity_logs" 
            ADD CONSTRAINT "FK_activity_logs_actor" 
            FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "activity_logs" 
            ADD CONSTRAINT "FK_activity_logs_target" 
            FOREIGN KEY ("targetId") REFERENCES "users"("id") ON DELETE SET NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "activity_logs" DROP CONSTRAINT "FK_activity_logs_target"`);
        await queryRunner.query(`ALTER TABLE "activity_logs" DROP CONSTRAINT "FK_activity_logs_actor"`);

        // Drop indexes
        await queryRunner.dropIndex('activity_logs', 'IDX_activity_logs_created_at');
        await queryRunner.dropIndex('activity_logs', 'IDX_activity_logs_resource');
        await queryRunner.dropIndex('activity_logs', 'IDX_activity_logs_actor_created');
        await queryRunner.dropIndex('activity_logs', 'IDX_activity_logs_type_level');

        // Drop table
        await queryRunner.dropTable('activity_logs');
    }
}
