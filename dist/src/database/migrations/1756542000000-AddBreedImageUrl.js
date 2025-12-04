"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddBreedImageUrl1756542000000 = void 0;
class AddBreedImageUrl1756542000000 {
    async up(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "breeds" 
      ADD COLUMN "imageUrl" varchar(500) NULL
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`
      ALTER TABLE "breeds" 
      DROP COLUMN "imageUrl"
    `);
    }
}
exports.AddBreedImageUrl1756542000000 = AddBreedImageUrl1756542000000;
//# sourceMappingURL=1756542000000-AddBreedImageUrl.js.map