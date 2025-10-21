import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserProfileFields1756546000000 implements MigrationInterface {
  name = 'AddUserProfileFields1756546000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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

  public async down(queryRunner: QueryRunner): Promise<void> {
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
