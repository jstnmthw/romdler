import * as cheerio from 'cheerio';
import type { ParsedLink, ParseResult } from './types.js';

/**
 * Parses an HTML page and extracts links from a table.
 *
 * Looks for:
 * - A table with the specified ID
 * - Rows containing <td class="link">
 * - Anchor tags within those cells
 *
 * Filters out:
 * - Parent directory links (../)
 * - Current directory links (./)
 * - Non-zip files (unless they have a valid href)
 */
export function parseTableLinks(html: string, tableId: string): ParseResult {
  const $ = cheerio.load(html);
  const table = $(`table#${tableId}`);

  if (table.length === 0) {
    return { tableFound: false, links: [] };
  }

  const links: ParsedLink[] = [];

  // Find all td.link cells and extract their anchor tags
  table.find('td.link').each((_, cell) => {
    const anchor = $(cell).find('a').first();

    if (anchor.length === 0) {
      return; // Skip cells without anchors
    }

    const href = anchor.attr('href');
    const text = anchor.text().trim();

    if (href === undefined || href === '') {
      return; // Skip empty hrefs
    }

    // Skip directory navigation links
    if (href === '../' || href === './' || href === '..') {
      return;
    }

    // Skip parent directory text
    if (text.toLowerCase().includes('parent directory')) {
      return;
    }

    links.push({ href, text });
  });

  return { tableFound: true, links };
}

/**
 * Filters links to only include .zip files.
 */
export function filterZipLinks(links: ParsedLink[]): ParsedLink[] {
  return links.filter((link) => {
    const lowerHref = link.href.toLowerCase();
    return lowerHref.endsWith('.zip');
  });
}
