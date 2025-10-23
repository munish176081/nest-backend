"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddBreedFeaturedField1756544000000 = void 0;
class AddBreedFeaturedField1756544000000 {
    constructor() {
        this.name = 'AddBreedFeaturedField1756544000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "breeds" 
      ADD COLUMN "is_featured" boolean NOT NULL DEFAULT false
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_breeds_is_featured" ON "breeds" ("is_featured")
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "IDX_breeds_is_featured"`);
        await queryRunner.query(`ALTER TABLE "breeds" DROP COLUMN "is_featured"`);
    }
}
exports.AddBreedFeaturedField1756544000000 = AddBreedFeaturedField1756544000000;
//# sourceMappingURL=1756544000000-AddBreedFeaturedField.js.map