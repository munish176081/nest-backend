import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class UpdateMeetingStatusAndAddCalendarEventId1756540000000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
