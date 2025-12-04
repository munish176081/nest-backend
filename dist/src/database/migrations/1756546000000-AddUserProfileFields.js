"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddUserProfileFields1756546000000 = void 0;
class AddUserProfileFields1756546000000 {
    constructor() {
        this.name = 'AddUserProfileFields1756546000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "phone" varchar(20),
      ADD COLUMN "bio" text,
      ADD COLUMN "website" varchar(512),
      ADD COLUMN "businessName" varchar(256),
      ADD COLUMN "businessABN" varchar(11),
      ADD COLUMN "description" text,
      ADD COLUMN "idVerification" jsonb
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN "phone",
      DROP COLUMN "bio",
      DROP COLUMN "website",
      DROP COLUMN "businessName",
      DROP COLUMN "businessABN",
      DROP COLUMN "description",
      DROP COLUMN "idVerification"
    `);
    }
}
exports.AddUserProfileFields1756546000000 = AddUserProfileFields1756546000000;
//# sourceMappingURL=1756546000000-AddUserProfileFields.js.map