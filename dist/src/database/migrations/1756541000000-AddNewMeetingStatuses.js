"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddNewMeetingStatuses1756541000000 = void 0;
class AddNewMeetingStatuses1756541000000 {
    constructor() {
        this.name = 'AddNewMeetingStatuses1756541000000';
    }
    async up(queryRunner) {
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
    async down(queryRunner) {
        console.log('Note: Enum values are not removed in down migration for PostgreSQL compatibility');
    }
}
exports.AddNewMeetingStatuses1756541000000 = AddNewMeetingStatuses1756541000000;
//# sourceMappingURL=1756541000000-AddNewMeetingStatuses.js.map