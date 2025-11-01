"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateBreedTypeImages1756543000000 = void 0;
const typeorm_1 = require("typeorm");
class CreateBreedTypeImages1756543000000 {
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
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
        }), true);
        await queryRunner.createIndex('breed_type_images', new typeorm_1.TableIndex({
            name: 'IDX_breed_type_images_category',
            columnNames: ['category'],
        }));
        await queryRunner.createIndex('breed_type_images', new typeorm_1.TableIndex({
            name: 'IDX_breed_type_images_isActive',
            columnNames: ['isActive'],
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropTable('breed_type_images');
    }
}
exports.CreateBreedTypeImages1756543000000 = CreateBreedTypeImages1756543000000;
//# sourceMappingURL=1756543000000-CreateBreedTypeImages.js.map