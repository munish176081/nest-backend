import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';
export declare class SnakeCaseNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
    columnName(propertyName: string, customName: string): string;
    tableName(targetName: string, userSpecifiedName: string | undefined): string;
    relationName(propertyName: string): string;
    joinColumnName(relationName: string, referencedColumnName: string): string;
    joinTableName(firstTableName: string, secondTableName: string, firstPropertyName: string): string;
    joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string;
    classTableInheritanceParentColumnName(parentTableName: any, parentTableIdPropertyName: any): string;
    eagerJoinRelationAlias(alias: string, propertyPath: string): string;
    private snakeCase;
}
