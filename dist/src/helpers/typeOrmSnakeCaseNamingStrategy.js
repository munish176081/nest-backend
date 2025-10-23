"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnakeCaseNamingStrategy = void 0;
const typeorm_1 = require("typeorm");
class SnakeCaseNamingStrategy extends typeorm_1.DefaultNamingStrategy {
    columnName(propertyName, customName) {
        return customName || this.snakeCase(propertyName);
    }
    tableName(targetName, userSpecifiedName) {
        return userSpecifiedName || this.snakeCase(targetName);
    }
    relationName(propertyName) {
        return this.snakeCase(propertyName);
    }
    joinColumnName(relationName, referencedColumnName) {
        return this.snakeCase(`${relationName}_${referencedColumnName}`);
    }
    joinTableName(firstTableName, secondTableName, firstPropertyName) {
        return this.snakeCase(`${firstTableName}_${firstPropertyName.replace(/\./gi, '_')}_${secondTableName}`);
    }
    joinTableColumnName(tableName, propertyName, columnName) {
        return this.snakeCase(`${tableName}_${columnName || propertyName}`);
    }
    classTableInheritanceParentColumnName(parentTableName, parentTableIdPropertyName) {
        return this.snakeCase(`${parentTableName}_${parentTableIdPropertyName}`);
    }
    eagerJoinRelationAlias(alias, propertyPath) {
        return `${alias}__${propertyPath.replace('.', '_')}`;
    }
    snakeCase(name) {
        return name
            .replace(/([a-z])([A-Z])/g, '$1_$2')
            .toLowerCase();
    }
}
exports.SnakeCaseNamingStrategy = SnakeCaseNamingStrategy;
//# sourceMappingURL=typeOrmSnakeCaseNamingStrategy.js.map