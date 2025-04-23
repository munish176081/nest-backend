import * as path from 'path';
import { configConfiguration, configValidationSchema } from './schema';

export const configOptions = {
  envFilePath: path.join(__dirname, `../../.env`),
  load: [configConfiguration],
  validationSchema: configValidationSchema,
  isGlobal: true,
  ignoreEnvVars: false,
  validationOptions: {
    abortEarly: true,
  },
};
