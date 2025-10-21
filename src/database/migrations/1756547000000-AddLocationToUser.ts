import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLocationToUser1756547000000 implements MigrationInterface {
    name = 'AddLocationToUser1756547000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "location" character varying(256)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "location"`);
    }
}
