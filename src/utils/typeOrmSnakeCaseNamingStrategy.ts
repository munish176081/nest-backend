import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

export class SnakeCaseNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  columnName(propertyName: string, customName: string): string {
    return customName || this.snakeCase(propertyName);
  }

  tableName(targetName: string, userSpecifiedName: string | undefined): string {
    return userSpecifiedName || this.snakeCase(targetName);
  }

  relationName(propertyName: string): string {
    return this.snakeCase(propertyName);
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return this.snakeCase(`${relationName}_${referencedColumnName}`);
  }

  joinTableName(
    firstTableName: string,
    secondTableName: string,
    firstPropertyName: string,
  ): string {
    return this.snakeCase(
      `${firstTableName}_${firstPropertyName.replace(
        /\./gi,
        '_',
      )}_${secondTableName}`,
    );
  }

  joinTableColumnName(
    tableName: string,
    propertyName: string,
    columnName?: string,
  ): string {
    return this.snakeCase(`${tableName}_${columnName || propertyName}`);
  }

  classTableInheritanceParentColumnName(
    parentTableName: any,
    parentTableIdPropertyName: any,
  ): string {
    return this.snakeCase(`${parentTableName}_${parentTableIdPropertyName}`);
  }

  eagerJoinRelationAlias(alias: string, propertyPath: string): string {
    return `${alias}__${propertyPath.replace('.', '_')}`;
  }

  private snakeCase(name: string): string {
    return name
      .replace(/([a-z])([A-Z])/g, '$1_$2') // Convert camelCase to snake_case
      .toLowerCase();
  }
}
