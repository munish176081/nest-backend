"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractMulterFiles = extractMulterFiles;
const path_1 = require("path");
function extractMulterFiles(files, pathPrefix = '') {
    const result = {};
    files.forEach((file) => {
        const fieldMatches = [...file.fieldname.matchAll(/\[(.*?)\]/g)].map((match) => match[1]);
        if (fieldMatches.length > 0) {
            assignNestedValue(result, fieldMatches, (0, path_1.join)(pathPrefix, file.path));
        }
    });
    return result;
}
function assignNestedValue(obj, keys, value) {
    let current = obj;
    keys.forEach((key, index) => {
        const isLastKey = index === keys.length - 1;
        const nextKeyIsNumeric = /^\d+$/.test(keys[index + 1]);
        if (isLastKey) {
            if (/^\d+$/.test(key)) {
                if (!Array.isArray(current)) {
                    if (typeof current === 'object' && Object.keys(current).length > 0) {
                        throw new Error(`Expected array but found object at key: ${key}`);
                    }
                    current = [];
                }
                current[parseInt(key)] = value;
            }
            else {
                if (!Array.isArray(current[key])) {
                    current[key] = [];
                }
                current[key].push(value);
            }
        }
        else {
            if (nextKeyIsNumeric) {
                if (!current[key]) {
                    current[key] = [];
                }
                if (!Array.isArray(current[key])) {
                    if (typeof current[key] === 'object' &&
                        Object.keys(current[key]).length > 0) {
                        throw new Error(`Expected array but found object at key: ${key}`);
                    }
                    current[key] = [];
                }
            }
            else {
                if (!current[key]) {
                    current[key] = {};
                }
                else if (Array.isArray(current[key])) {
                    throw new Error(`Expected object but found array at key: ${key}`);
                }
            }
            current = current[key];
        }
    });
}
//# sourceMappingURL=extractMulterFiles.js.map