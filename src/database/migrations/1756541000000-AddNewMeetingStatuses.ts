import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNewMeetingStatuses1756541000000 implements MigrationInterface {
    name = 'AddNewMeetingStatuses1756541000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new status values to the existing enum
        await queryRunner.query(`
            ALTER TYPE meetings_status_enum ADD VALUE IF NOT EXISTS 'tentative';
        `);
        
        await queryRunner.query(`
            ALTER TYPE meetings_status_enum ADD VALUE IF NOT EXISTS 'deleted';
        `);
        
        await queryRunner.query(`
            ALTER TYPE meetings_status_enum ADD VALUE IF NOT EXISTS 'cancelled_by_user';
        `);

        console.log('✅ New meeting statuses added to enum');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Note: PostgreSQL doesn't support removing values from enums easily
        // In production, you might need to recreate the enum
        console.log('Note: Enum values are not removed in down migration for PostgreSQL compatibility');
    }
}
