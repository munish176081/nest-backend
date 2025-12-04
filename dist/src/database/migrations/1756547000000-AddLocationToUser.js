"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddLocationToUser1756547000000 = void 0;
class AddLocationToUser1756547000000 {
    constructor() {
        this.name = 'AddLocationToUser1756547000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "users" ADD "location" character varying(256)`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "location"`);
    }
}
exports.AddLocationToUser1756547000000 = AddLocationToUser1756547000000;
//# sourceMappingURL=1756547000000-AddLocationToUser.js.map