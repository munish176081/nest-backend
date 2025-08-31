import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateMeetingStatusAndAddCalendarEventId1756540000000 implements MigrationInterface {
    name = 'UpdateMeetingStatusAndAddCalendarEventId1756540000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new status values to the existing enum
        await queryRunner.query(`
            ALTER TYPE meetings_status_enum ADD VALUE IF NOT EXISTS 'rescheduled';
        `);
        
        await queryRunner.query(`
            ALTER TYPE meetings_status_enum ADD VALUE IF NOT EXISTS 'no_show';
        `);
        
        await queryRunner.query(`
            ALTER TYPE meetings_status_enum ADD VALUE IF NOT EXISTS 'cancelled_by_buyer';
        `);
        
        await queryRunner.query(`
            ALTER TYPE meetings_status_enum ADD VALUE IF NOT EXISTS 'cancelled_by_seller';
        `);
        
        await queryRunner.query(`
            ALTER TYPE meetings_status_enum ADD VALUE IF NOT EXISTS 'cancelled_by_user';
        `);

        // Add calendar_event_id column to meetings table
        await queryRunner.query(`
            ALTER TABLE "meetings" ADD COLUMN "calendarEventId" character varying;
        `);

        // Create index for calendar event ID lookups
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_meetings_calendar_event_id" ON "meetings" ("calendarEventId");
        `);

        // Create user_calendar_tokens table
        await queryRunner.query(`
            CREATE TABLE "user_calendar_tokens" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" character varying NOT NULL,
                "accessToken" text NOT NULL,
                "refreshToken" text,
                "expiryDate" bigint,
                "scope" jsonb,
                "isActive" boolean NOT NULL DEFAULT true,
                "calendarId" character varying,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_user_calendar_tokens_id" PRIMARY KEY ("id")
            );
        `);

        // Create unique index for userId in user_calendar_tokens
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_user_calendar_tokens_userId" ON "user_calendar_tokens" ("userId");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop user_calendar_tokens table
        await queryRunner.query(`
            DROP TABLE IF EXISTS "user_calendar_tokens";
        `);

        // Drop calendar_event_id column from meetings table
        await queryRunner.query(`
            ALTER TABLE "meetings" DROP COLUMN IF EXISTS "calendarEventId";
        `);

        // Note: PostgreSQL doesn't support removing values from enums easily
        // In a production environment, you might need to recreate the enum
        // For now, we'll leave the enum values as they won't cause issues
        console.log('Note: Enum values are not removed in down migration for PostgreSQL compatibility');
    }
}
