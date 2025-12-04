"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddStudInfoToListings1756544000000 = void 0;
class AddStudInfoToListings1756544000000 {
    constructor() {
        this.name = 'AddStudInfoToListings1756544000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "listings" 
      ADD COLUMN "studInfo" jsonb
    `);
        await queryRunner.query(`
      CREATE INDEX "idx_listings_stud_info" ON "listings" USING GIN ("studInfo")
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      DROP INDEX "idx_listings_stud_info"
    `);
        await queryRunner.query(`
      ALTER TABLE "listings" 
      DROP COLUMN "studInfo"
    `);
    }
}
exports.AddStudInfoToListings1756544000000 = AddStudInfoToListings1756544000000;
//# sourceMappingURL=1756544000000-AddStudInfoToListings.js.map