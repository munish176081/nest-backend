import { join } from 'path';

export function extractMulterFiles(
  files: Express.Multer.File[],
  pathPrefix = '',
) {
  const result: Record<string, any> = {};

  files.forEach((file) => {
    const fieldMatches = [...file.fieldname.matchAll(/\[(.*?)\]/g)].map(
      (match) => match[1],
    );

    if (fieldMatches.length > 0) {
      // Recursively assign the path to the correct nested structure
      assignNestedValue(result, fieldMatches, join(pathPrefix, file.path));
    }
  });

  return result;
}

// Helper function to assign value at any nesting level, handling both objects and arrays
function assignNestedValue(
  obj: Record<string, any>,
  keys: string[],
  value: string,
) {
  let current = obj;

  keys.forEach((key, index) => {
    const isLastKey = index === keys.length - 1;
    const nextKeyIsNumeric = /^\d+$/.test(keys[index + 1]); // Check if next key is numeric

    if (isLastKey) {
      // If it's the last key, push the value into an array or object depending on key type
      if (/^\d+$/.test(key)) {
        // If the last key is a number, treat this level as an array
        if (!Array.isArray(current)) {
          if (typeof current === 'object' && Object.keys(current).length > 0) {
            // Throw an error if it's an object but expected to be an array
            throw new Error(`Expected array but found object at key: ${key}`);
          }
          current = [];
        }
        current[parseInt(key)] = value;
      } else {
        if (!Array.isArray(current[key])) {
          current[key] = [];
        }
        current[key].push(value);
      }
    } else {
      // If the next key is a number, this key should lead to an array
      if (nextKeyIsNumeric) {
        if (!current[key]) {
          current[key] = [];
        }
        // Ensure the current level is treated as an array
        if (!Array.isArray(current[key])) {
          if (
            typeof current[key] === 'object' &&
            Object.keys(current[key]).length > 0
          ) {
            // Throw an error if it's an object but expected to be an array
            throw new Error(`Expected array but found object at key: ${key}`);
          }
          current[key] = [];
        }
      } else {
        // If it's not numeric, treat it as an object
        if (!current[key]) {
          current[key] = {};
        } else if (Array.isArray(current[key])) {
          // Throw an error if it's an array but expected to be an object
          throw new Error(`Expected object but found array at key: ${key}`);
        }
      }

      // Move deeper into the structure
      current = current[key];
    }
  });
}
