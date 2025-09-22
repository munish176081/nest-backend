import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBreedImageUrl1756542000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "breeds" 
      ADD COLUMN "imageUrl" varchar(500) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "breeds" 
      DROP COLUMN "imageUrl"
    `);
  }
}
