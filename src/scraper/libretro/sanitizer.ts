/**
 * Libretro Thumbnails filename sanitization.
 *
 * According to the libretro-thumbnails specification, certain characters
 * in game names must be replaced with underscores in the filename:
 * &  *  /  :  <  >  ?  \  |  "
 *
 * Reference: https://github.com/libretro-thumbnails/libretro-thumbnails#naming-convention
 */

/** Characters that must be replaced with underscore in Libretro filenames */
const INVALID_CHARS = /[&*/:<>?\\|"]/g;

/**
 * Sanitize a ROM filename stem for use in Libretro thumbnail URLs.
 *
 * @param stem Filename without extension (e.g., "Q*Bert's Qubes (USA)")
 * @returns Sanitized filename safe for Libretro URLs (e.g., "Q_Bert's Qubes (USA)")
 *
 * @example
 * sanitizeFilename("Q*Bert's Qubes (USA)") // "Q_Bert's Qubes (USA)"
 * sanitizeFilename("Super Mario Bros. 3 (USA)") // "Super Mario Bros. 3 (USA)"
 * sanitizeFilename("What's My Name?") // "What's My Name_"
 */
export function sanitizeFilename(stem: string): string {
  return stem.replace(INVALID_CHARS, '_');
}

/**
 * Check if a filename contains any invalid characters for Libretro.
 *
 * @param stem Filename without extension
 * @returns true if the filename contains invalid characters
 */
export function hasInvalidChars(stem: string): boolean {
  return INVALID_CHARS.test(stem);
}
