"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateActivityLogsTable1756545000000 = void 0;
const typeorm_1 = require("typeorm");
class CreateActivityLogsTable1756545000000 {
    constructor() {
        this.name = 'CreateActivityLogsTable1756545000000';
    }
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
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
        }), true);
        await queryRunner.createIndex('activity_logs', new typeorm_1.TableIndex({
            name: 'IDX_activity_logs_type_level',
            columnNames: ['type', 'level']
        }));
        await queryRunner.createIndex('activity_logs', new typeorm_1.TableIndex({
            name: 'IDX_activity_logs_actor_created',
            columnNames: ['actorId', 'createdAt']
        }));
        await queryRunner.createIndex('activity_logs', new typeorm_1.TableIndex({
            name: 'IDX_activity_logs_resource',
            columnNames: ['resourceType', 'resourceId']
        }));
        await queryRunner.createIndex('activity_logs', new typeorm_1.TableIndex({
            name: 'IDX_activity_logs_created_at',
            columnNames: ['createdAt']
        }));
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
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "activity_logs" DROP CONSTRAINT "FK_activity_logs_target"`);
        await queryRunner.query(`ALTER TABLE "activity_logs" DROP CONSTRAINT "FK_activity_logs_actor"`);
        await queryRunner.dropIndex('activity_logs', 'IDX_activity_logs_created_at');
        await queryRunner.dropIndex('activity_logs', 'IDX_activity_logs_resource');
        await queryRunner.dropIndex('activity_logs', 'IDX_activity_logs_actor_created');
        await queryRunner.dropIndex('activity_logs', 'IDX_activity_logs_type_level');
        await queryRunner.dropTable('activity_logs');
    }
}
exports.CreateActivityLogsTable1756545000000 = CreateActivityLogsTable1756545000000;
//# sourceMappingURL=1756545000000-CreateActivityLogsTable.js.map