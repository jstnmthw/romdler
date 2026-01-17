export { runDedupe, type DedupeOptions } from './dedupe.js';
export { parseRomFilename } from './parser.js';
export { groupRomsBySignature, analyzeGroup, getGroupsWithDuplicates } from './grouper.js';
export type {
  ParsedRomName,
  DedupeRomFile,
  RomGroup,
  DedupeResult,
  DedupeSummary,
} from './types.js';
