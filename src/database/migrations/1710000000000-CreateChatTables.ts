import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateChatTables1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create conversations table
    await queryRunner.createTable(
      new Table({
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
      }),
      true
    );

    // Create participants table
    await queryRunner.createTable(
      new Table({
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
      }),
      true
    );

    // Create messages table
    await queryRunner.createTable(
      new Table({
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
      }),
      true
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'participants',
      new TableForeignKey({
        columnNames: ['conversationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'conversations',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'participants',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'messages',
      new TableForeignKey({
        columnNames: ['conversationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'conversations',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'messages',
      new TableForeignKey({
        columnNames: ['senderId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'messages',
      new TableForeignKey({
        columnNames: ['replyTo'],
        referencedColumnNames: ['id'],
        referencedTableName: 'messages',
        onDelete: 'SET NULL',
      })
    );

    await queryRunner.createForeignKey(
      'conversations',
      new TableForeignKey({
        columnNames: ['listingId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'listings',
        onDelete: 'SET NULL',
      })
    );

    await queryRunner.createForeignKey(
      'conversations',
      new TableForeignKey({
        columnNames: ['lastMessageId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'messages',
        onDelete: 'SET NULL',
      })
    );

    // Create indexes for better performance
    await queryRunner.createIndex(
      'conversations',
      new TableIndex({
        name: 'IDX_CONVERSATIONS_PARTICIPANTS',
        columnNames: ['id'],
      })
    );

    await queryRunner.createIndex(
      'participants',
      new TableIndex({
        name: 'IDX_PARTICIPANTS_USER_ID',
        columnNames: ['userId'],
      })
    );

    await queryRunner.createIndex(
      'participants',
      new TableIndex({
        name: 'IDX_PARTICIPANTS_CONVERSATION_ID',
        columnNames: ['conversationId'],
      })
    );

    await queryRunner.createIndex(
      'messages',
      new TableIndex({
        name: 'IDX_MESSAGES_CONVERSATION_ID',
        columnNames: ['conversationId'],
      })
    );

    await queryRunner.createIndex(
      'messages',
      new TableIndex({
        name: 'IDX_MESSAGES_SENDER_ID',
        columnNames: ['senderId'],
      })
    );

    await queryRunner.createIndex(
      'messages',
      new TableIndex({
        name: 'IDX_MESSAGES_TIMESTAMP',
        columnNames: ['timestamp'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
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

    // Drop tables
    await queryRunner.dropTable('messages');
    await queryRunner.dropTable('participants');
    await queryRunner.dropTable('conversations');
  }
} 