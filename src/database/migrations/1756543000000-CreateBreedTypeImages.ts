import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateBreedTypeImages1756543000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'breed_type_images',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'category',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'imageUrl',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'sortOrder',
            type: 'int',
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex('breed_type_images', new TableIndex({
      name: 'IDX_breed_type_images_category',
      columnNames: ['category'],
    }));

    await queryRunner.createIndex('breed_type_images', new TableIndex({
      name: 'IDX_breed_type_images_isActive',
      columnNames: ['isActive'],
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('breed_type_images');
  }
}
