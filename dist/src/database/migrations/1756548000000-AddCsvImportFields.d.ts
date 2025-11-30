import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddCsvImportFields1756548000000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
