import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStudInfoToListings1756544000000 implements MigrationInterface {
  name = 'AddStudInfoToListings1756544000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add studInfo column to listings table
    await queryRunner.query(`
      ALTER TABLE "listings" 
      ADD COLUMN "studInfo" jsonb
    `);

    // Add index for studInfo column
    await queryRunner.query(`
      CREATE INDEX "idx_listings_stud_info" ON "listings" USING GIN ("studInfo")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the index first
    await queryRunner.query(`
      DROP INDEX "idx_listings_stud_info"
    `);

    // Drop the studInfo column
    await queryRunner.query(`
      ALTER TABLE "listings" 
      DROP COLUMN "studInfo"
    `);
  }
}
