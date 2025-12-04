"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateMeetingStatusAndAddCalendarEventId1756540000000 = void 0;
class UpdateMeetingStatusAndAddCalendarEventId1756540000000 {
    constructor() {
        this.name = 'UpdateMeetingStatusAndAddCalendarEventId1756540000000';
    }
    async up(queryRunner) {
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
        await queryRunner.query(`
            ALTER TABLE "meetings" ADD COLUMN "calendarEventId" character varying;
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_meetings_calendar_event_id" ON "meetings" ("calendarEventId");
        `);
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
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_user_calendar_tokens_userId" ON "user_calendar_tokens" ("userId");
        `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
            DROP TABLE IF EXISTS "user_calendar_tokens";
        `);
        await queryRunner.query(`
            ALTER TABLE "meetings" DROP COLUMN IF EXISTS "calendarEventId";
        `);
        console.log('Note: Enum values are not removed in down migration for PostgreSQL compatibility');
    }
}
exports.UpdateMeetingStatusAndAddCalendarEventId1756540000000 = UpdateMeetingStatusAndAddCalendarEventId1756540000000;
//# sourceMappingURL=1756540000000-UpdateMeetingStatusAndAddCalendarEventId.js.map