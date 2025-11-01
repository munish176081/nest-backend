import { MigrationInterface, QueryRunner } from "typeorm";
export declare class AddLocationToUser1756547000000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
