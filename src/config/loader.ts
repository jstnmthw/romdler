import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { configSchema, type Config } from './schema.js';
import { ZodError } from 'zod';

const CONFIG_FILENAME = 'app.config.json';

export function loadConfig(configPath?: string): Config {
  const path = configPath ?? resolve(process.cwd(), CONFIG_FILENAME);

  let rawContent: string;
  try {
    rawContent = readFileSync(path, 'utf-8');
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      throw new Error(`Config file not found: ${path}`);
    }
    throw new Error(`Failed to read config file: ${error.message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new Error(`Invalid JSON in config file: ${path}`);
  }

  try {
    return configSchema.parse(parsed);
  } catch (err) {
    if (err instanceof ZodError) {
      const issues = err.issues.map((issue) => {
        const path = issue.path.join('.');
        return `  - ${path !== '' ? path : 'root'}: ${issue.message}`;
      });
      throw new Error(`Config validation failed:\n${issues.join('\n')}`);
    }
    throw err;
  }
}
