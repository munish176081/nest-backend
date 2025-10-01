import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBreedFeaturedField1756544000000 implements MigrationInterface {
  name = 'AddBreedFeaturedField1756544000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "breeds" 
      ADD COLUMN "is_featured" boolean NOT NULL DEFAULT false
    `);
    
    await queryRunner.query(`
      CREATE INDEX "IDX_breeds_is_featured" ON "breeds" ("is_featured")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_breeds_is_featured"`);
    await queryRunner.query(`ALTER TABLE "breeds" DROP COLUMN "is_featured"`);
  }
}
