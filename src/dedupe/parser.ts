import type { ParsedRomName } from './types.js';

/** Known region codes in parentheses */
const REGION_CODES = new Set([
  'USA',
  'Europe',
  'Japan',
  'World',
  'Australia',
  'Brazil',
  'Canada',
  'China',
  'France',
  'Germany',
  'Hong Kong',
  'Italy',
  'Korea',
  'Mexico',
  'Netherlands',
  'Russia',
  'Spain',
  'Sweden',
  'Taiwan',
  'UK',
]);

/** Patterns for variant indicators (non-clean versions to remove when clean exists) */
const VARIANT_PATTERNS = [
  // Development versions
  /^Rev\s*\d*$/i,
  /^Rev\s+[A-Z]$/i,
  /^Beta\s*\d*$/i,
  /^Proto\s*\d*$/i,
  /^Sample$/i,
  /^Demo$/i,
  /^Preview$/i,
  /^Promo$/i,
  // Dated builds
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{4}\.\d{2}\.\d{2}$/,
  // Re-release platforms
  /^Virtual\s+Console$/i,
  /^GameCube\s+Edition$/i,
  /^GameCube$/i,
  /^Capcom\s+Town$/i,
  /^e-Reader$/i,
  /^iam8bit$/i,
  /^Retro-Bit$/i,
  /^Animal\s+Crossing$/i,
  /^Switch\s+Online$/i,
  /^Classic\s+NES\s+Series$/i,
  /^Famicom\s+Mini$/i,
  /^Wii\s+U\s+Virtual\s+Console$/i,
  /^3DS\s+Virtual\s+Console$/i,
  /^Limited\s+Run$/i,
  /^Arcade\s+Archives$/i,
];

/** Patterns for quality modifiers (preserve as part of identity) */
const QUALITY_MODIFIER_PATTERNS = [
  // Hardware features
  /^SGB\s+Enhanced$/i,
  /^GB\s+Compatible$/i,
  /^Rumble\s+Version$/i,
  /^Super\s+Game\s+Boy$/i,
  /^Game\s+Boy\s+Color$/i,
  /^GBC$/i,
  // Distribution type
  /^Unl$/i,
  /^Pirate$/i,
  /^Aftermarket$/i,
  // Compilation releases
  /^Alt$/i,
  /^Alt\s+\d+$/i,
  // Enhancement chips
  /^SA-1$/i,
  /^DSP-\d$/i,
  /^SuperFX$/i,
];

/** Pattern for multi-language codes like (En,Fr,De) */
const LANGUAGE_PATTERN = /^[A-Z][a-z](?:,[A-Z][a-z])*$/;

/** Pattern for single language code */
const SINGLE_LANGUAGE_PATTERN = /^(?:En|Fr|De|Es|It|Ja|Pt|Nl|Sv|No|Da|Fi|Pl|Ru|Ko|Zh)$/;

/**
 * Check if a token is a region code
 * @param token - Parenthetical token to check
 * @returns True if token is a region code
 */
function isRegion(token: string): boolean {
  return REGION_CODES.has(token);
}

/**
 * Check if a token is a variant indicator
 * @param token - Parenthetical token to check
 * @returns True if token indicates a variant/non-clean version
 */
function isVariantIndicator(token: string): boolean {
  return VARIANT_PATTERNS.some((pattern) => pattern.test(token));
}

/**
 * Check if a token is a quality modifier
 * @param token - Parenthetical token to check
 * @returns True if token is a quality modifier
 */
function isQualityModifier(token: string): boolean {
  // Check explicit patterns
  if (QUALITY_MODIFIER_PATTERNS.some((pattern) => pattern.test(token))) {
    return true;
  }

  // Check language codes
  if (LANGUAGE_PATTERN.test(token) || SINGLE_LANGUAGE_PATTERN.test(token)) {
    return true;
  }

  return false;
}

/**
 * Extract parenthetical tokens from a filename
 * @param filename - ROM filename
 * @returns Array of tokens found in parentheses
 */
function extractTokens(filename: string): string[] {
  const tokens: string[] = [];
  const regex = /\(([^)]+)\)/g;
  let match = regex.exec(filename);

  while (match !== null) {
    const token = match[1];
    if (token !== undefined) {
      tokens.push(token.trim());
    }
    match = regex.exec(filename);
  }

  return tokens;
}

/**
 * Extract title from filename (text before first parenthesis)
 * @param filename - ROM filename
 * @returns Title with extension removed
 */
function extractTitle(filename: string): string {
  // Remove file extension
  const withoutExt = filename.replace(/\.[^.]+$/, '');

  // Find first parenthesis
  const parenIndex = withoutExt.indexOf('(');
  const title =
    parenIndex > 0 ? withoutExt.substring(0, parenIndex).trim() : withoutExt.trim();

  return title;
}

/**
 * Create a base signature for grouping ROMs
 * @param title - Game title
 * @param regions - Region codes
 * @param qualityModifiers - Quality modifiers
 * @returns Normalized signature string
 */
function createBaseSignature(
  title: string,
  regions: string[],
  qualityModifiers: string[]
): string {
  // Normalize title: lowercase, remove special chars, collapse whitespace
  const normalizedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Sort and normalize regions
  const normalizedRegions = regions.map((r) => r.toLowerCase()).sort();

  // Sort and normalize quality modifiers
  const normalizedModifiers = qualityModifiers.map((m) => m.toLowerCase()).sort();

  return `${normalizedTitle}|${normalizedRegions.join(',')}|${normalizedModifiers.join(',')}`;
}

/**
 * Parse a ROM filename into its components
 * @param filename - ROM filename to parse
 * @returns Parsed ROM name with extracted components
 */
export function parseRomFilename(filename: string): ParsedRomName {
  const title = extractTitle(filename);
  const tokens = extractTokens(filename);

  const regions: string[] = [];
  const qualityModifiers: string[] = [];
  const variantIndicators: string[] = [];

  for (const token of tokens) {
    if (isRegion(token)) {
      regions.push(token);
    } else if (isVariantIndicator(token)) {
      variantIndicators.push(token);
    } else if (isQualityModifier(token)) {
      qualityModifiers.push(token);
    }
    // Unrecognized tokens are ignored for grouping purposes
  }

  const isClean = variantIndicators.length === 0;
  const baseSignature = createBaseSignature(title, regions, qualityModifiers);

  return {
    filename,
    title,
    regions,
    qualityModifiers,
    variantIndicators,
    isClean,
    baseSignature,
  };
}
