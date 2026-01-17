export { ScreenScraperClient, selectMediaUrl, getAvailableMediaTypes } from './client.js';
export {
  SYSTEMS,
  getSystemById,
  getSystemByName,
  getExtensionsForSystem,
  isValidExtension,
} from './systems.js';
export { ScreenScraperAdapter, createScreenScraperAdapter } from './adapter.js';
export type { ScreenScraperAdapterOptions } from './adapter.js';
export type { SystemDefinition } from './systems.js';
export type {
  SSMedia,
  SSName,
  SSRom,
  SSGame,
  SSResponse,
  GameLookupResult,
  SSError,
  LookupParams,
} from './types.js';
