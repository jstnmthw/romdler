export { ScreenScraperClient, selectMediaUrl, getAvailableMediaTypes } from './client.js';
export { SYSTEMS, getSystemById, getSystemByName, getExtensionsForSystem, isValidExtension } from './systems.js';
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
