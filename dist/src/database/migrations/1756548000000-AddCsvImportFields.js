"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddCsvImportFields1756548000000 = void 0;
class AddCsvImportFields1756548000000 {
    constructor() {
        this.name = 'AddCsvImportFields1756548000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "email2" varchar(256),
      ADD COLUMN "phone2" varchar(20),
      ADD COLUMN "fax" varchar(20),
      ADD COLUMN "address" varchar(512),
      ADD COLUMN "address2" varchar(512),
      ADD COLUMN "zip" varchar(20),
      ADD COLUMN "city" varchar(256),
      ADD COLUMN "state" varchar(100),
      ADD COLUMN "country" varchar(100),
      ADD COLUMN "firstName" varchar(256),
      ADD COLUMN "lastName" varchar(256),
      ADD COLUMN "isImportedFromCsv" boolean NOT NULL DEFAULT false,
      ADD COLUMN "isProfileComplete" boolean NOT NULL DEFAULT false,
      ADD COLUMN "missingRequiredFields" jsonb,
      ADD COLUMN "csvOptionalFields" jsonb
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_users_isImportedFromCsv" ON "users" ("isImportedFromCsv")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_users_isProfileComplete" ON "users" ("isProfileComplete")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_users_country_state" ON "users" ("country", "state")
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "IDX_users_country_state"`);
        await queryRunner.query(`DROP INDEX "IDX_users_isProfileComplete"`);
        await queryRunner.query(`DROP INDEX "IDX_users_isImportedFromCsv"`);
        await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN "email2",
      DROP COLUMN "phone2",
      DROP COLUMN "fax",
      DROP COLUMN "address",
      DROP COLUMN "address2",
      DROP COLUMN "zip",
      DROP COLUMN "city",
      DROP COLUMN "state",
      DROP COLUMN "country",
      DROP COLUMN "firstName",
      DROP COLUMN "lastName",
      DROP COLUMN "isImportedFromCsv",
      DROP COLUMN "isProfileComplete",
      DROP COLUMN "missingRequiredFields",
      DROP COLUMN "csvOptionalFields"
    `);
    }
}
exports.AddCsvImportFields1756548000000 = AddCsvImportFields1756548000000;
//# sourceMappingURL=1756548000000-AddCsvImportFields.js.map