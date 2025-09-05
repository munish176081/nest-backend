import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWishlistTable1710000000002 implements MigrationInterface {
  name = 'CreateWishlistTable1710000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "wishlist" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "listingId" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wishlist" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_wishlist_user_listing" ON "wishlist" ("userId", "listingId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_wishlist_userId" ON "wishlist" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_wishlist_listingId" ON "wishlist" ("listingId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_wishlist_createdAt" ON "wishlist" ("createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_wishlist_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_wishlist_listingId"`);
    await queryRunner.query(`DROP INDEX "IDX_wishlist_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_wishlist_user_listing"`);
    await queryRunner.query(`DROP TABLE "wishlist"`);
  }
}
