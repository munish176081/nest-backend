import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddUserProfileFields1756546000000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
