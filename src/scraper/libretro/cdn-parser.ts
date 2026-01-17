/**
 * CDN directory listing parser for Libretro thumbnails.
 *
 * Parses Apache autoindex directory listings from thumbnails.libretro.com
 * to extract PNG filenames when GitHub API is rate-limited.
 */

import * as cheerio from 'cheerio';

/**
 * Parse CDN directory listing HTML and extract PNG filenames.
 * The CDN uses Apache autoindex format with links inside a <pre> tag.
 *
 * @param html The HTML content from the CDN directory page
 * @returns Array of filenames (without .png extension)
 */
export function parseCdnDirectory(html: string): string[] {
  const $ = cheerio.load(html);
  const filenames: string[] = [];

  // Apache autoindex puts links inside a <pre> tag
  // Each link looks like: <a href="filename.png">filename.png</a>
  $('pre a, table a, body a').each((_, element) => {
    const href = $(element).attr('href');
    if (href === undefined || href === null) {
      return;
    }

    // Skip parent directory link and non-PNG files
    if (href === '../' || !href.endsWith('.png')) {
      return;
    }

    // Decode URL-encoded filename and remove .png extension
    const decoded = decodeURIComponent(href);
    const filename = decoded.slice(0, -4); // Remove .png

    filenames.push(filename);
  });

  return filenames;
}
