"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configOptions = void 0;
const path = require("path");
const schema_1 = require("./schema");
exports.configOptions = {
    envFilePath: path.join(process.cwd(), '.env'),
    load: [schema_1.configConfiguration],
    validationSchema: schema_1.configValidationSchema,
    isGlobal: true,
    ignoreEnvVars: false,
    validationOptions: {
        abortEarly: true,
    },
};
//# sourceMappingURL=options.js.map