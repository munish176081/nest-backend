"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateChatTables1710000000000 = void 0;
const typeorm_1 = require("typeorm");
class CreateChatTables1710000000000 {
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'conversations',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    default: 'uuid_generate_v4()',
                },
                {
                    name: 'subject',
                    type: 'varchar',
                    isNullable: true,
                },
                {
                    name: 'conversationType',
                    type: 'enum',
                    enum: ['direct', 'listing', 'support'],
                    default: "'direct'",
                },
                {
                    name: 'isActive',
                    type: 'boolean',
                    default: true,
                },
                {
                    name: 'unreadCount',
                    type: 'integer',
                    default: 0,
                },
                {
                    name: 'listingId',
                    type: 'uuid',
                    isNullable: true,
                },
                {
                    name: 'metadata',
                    type: 'jsonb',
                    isNullable: true,
                },
                {
                    name: 'lastMessageId',
                    type: 'uuid',
                    isNullable: true,
                },
                {
                    name: 'createdAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                },
                {
                    name: 'updatedAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                },
            ],
        }), true);
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'participants',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    default: 'uuid_generate_v4()',
                },
                {
                    name: 'conversationId',
                    type: 'uuid',
                },
                {
                    name: 'userId',
                    type: 'uuid',
                },
                {
                    name: 'name',
                    type: 'varchar',
                },
                {
                    name: 'avatar',
                    type: 'varchar',
                    isNullable: true,
                },
                {
                    name: 'role',
                    type: 'enum',
                    enum: ['buyer', 'seller', 'admin'],
                    default: "'buyer'",
                },
                {
                    name: 'isOnline',
                    type: 'boolean',
                    default: false,
                },
                {
                    name: 'lastSeen',
                    type: 'timestamp',
                    isNullable: true,
                },
                {
                    name: 'unreadCount',
                    type: 'integer',
                    default: 0,
                },
                {
                    name: 'createdAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                },
                {
                    name: 'updatedAt',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                },
            ],
        }), true);
        await queryRunner.createTable(new typeorm_1.Table({
            name: 'messages',
            columns: [
                {
                    name: 'id',
                    type: 'uuid',
                    isPrimary: true,
                    default: 'uuid_generate_v4()',
                },
                {
                    name: 'conversationId',
                    type: 'uuid',
                },
                {
                    name: 'senderId',
                    type: 'uuid',
                },
                {
                    name: 'content',
                    type: 'text',
                },
                {
                    name: 'messageType',
                    type: 'enum',
                    enum: ['text', 'image', 'file', 'listing'],
                    default: "'text'",
                },
                {
                    name: 'replyTo',
                    type: 'uuid',
                    isNullable: true,
                },
                {
                    name: 'attachments',
                    type: 'jsonb',
                    isNullable: true,
                },
                {
                    name: 'listingReference',
                    type: 'jsonb',
                    isNullable: true,
                },
                {
                    name: 'isRead',
                    type: 'boolean',
                    default: false,
                },
                {
                    name: 'readBy',
                    type: 'text',
                    isArray: true,
                    default: '{}',
                },
                {
                    name: 'timestamp',
                    type: 'timestamp',
                    default: 'CURRENT_TIMESTAMP',
                },
            ],
        }), true);
        await queryRunner.createForeignKey('participants', new typeorm_1.TableForeignKey({
            columnNames: ['conversationId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'conversations',
            onDelete: 'CASCADE',
        }));
        await queryRunner.createForeignKey('participants', new typeorm_1.TableForeignKey({
            columnNames: ['userId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
        }));
        await queryRunner.createForeignKey('messages', new typeorm_1.TableForeignKey({
            columnNames: ['conversationId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'conversations',
            onDelete: 'CASCADE',
        }));
        await queryRunner.createForeignKey('messages', new typeorm_1.TableForeignKey({
            columnNames: ['senderId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
        }));
        await queryRunner.createForeignKey('messages', new typeorm_1.TableForeignKey({
            columnNames: ['replyTo'],
            referencedColumnNames: ['id'],
            referencedTableName: 'messages',
            onDelete: 'SET NULL',
        }));
        await queryRunner.createForeignKey('conversations', new typeorm_1.TableForeignKey({
            columnNames: ['listingId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'listings',
            onDelete: 'SET NULL',
        }));
        await queryRunner.createForeignKey('conversations', new typeorm_1.TableForeignKey({
            columnNames: ['lastMessageId'],
            referencedColumnNames: ['id'],
            referencedTableName: 'messages',
            onDelete: 'SET NULL',
        }));
        await queryRunner.createIndex('conversations', new typeorm_1.TableIndex({
            name: 'IDX_CONVERSATIONS_PARTICIPANTS',
            columnNames: ['id'],
        }));
        await queryRunner.createIndex('participants', new typeorm_1.TableIndex({
            name: 'IDX_PARTICIPANTS_USER_ID',
            columnNames: ['userId'],
        }));
        await queryRunner.createIndex('participants', new typeorm_1.TableIndex({
            name: 'IDX_PARTICIPANTS_CONVERSATION_ID',
            columnNames: ['conversationId'],
        }));
        await queryRunner.createIndex('messages', new typeorm_1.TableIndex({
            name: 'IDX_MESSAGES_CONVERSATION_ID',
            columnNames: ['conversationId'],
        }));
        await queryRunner.createIndex('messages', new typeorm_1.TableIndex({
            name: 'IDX_MESSAGES_SENDER_ID',
            columnNames: ['senderId'],
        }));
        await queryRunner.createIndex('messages', new typeorm_1.TableIndex({
            name: 'IDX_MESSAGES_TIMESTAMP',
            columnNames: ['timestamp'],
        }));
    }
    async down(queryRunner) {
        const participantsTable = await queryRunner.getTable('participants');
        const messagesTable = await queryRunner.getTable('messages');
        const conversationsTable = await queryRunner.getTable('conversations');
        if (participantsTable) {
            const foreignKeys = participantsTable.foreignKeys;
            for (const foreignKey of foreignKeys) {
                await queryRunner.dropForeignKey('participants', foreignKey);
            }
        }
        if (messagesTable) {
            const foreignKeys = messagesTable.foreignKeys;
            for (const foreignKey of foreignKeys) {
                await queryRunner.dropForeignKey('messages', foreignKey);
            }
        }
        if (conversationsTable) {
            const foreignKeys = conversationsTable.foreignKeys;
            for (const foreignKey of foreignKeys) {
                await queryRunner.dropForeignKey('conversations', foreignKey);
            }
        }
        await queryRunner.dropTable('messages');
        await queryRunner.dropTable('participants');
        await queryRunner.dropTable('conversations');
    }
}
exports.CreateChatTables1710000000000 = CreateChatTables1710000000000;
//# sourceMappingURL=1710000000000-CreateChatTables.js.map