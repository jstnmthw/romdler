import * as cheerio from 'cheerio';
import type { ParsedLink, ParseResult } from './types.js';

/**
 * Parses a human-readable file size string into bytes.
 * Handles formats like: "155.7 KiB", "1.2 MiB", "500 B", "1.5 GB"
 * Returns undefined for invalid/unknown formats (e.g., "-" for directories).
 */
export function parseFileSize(sizeStr: string): number | undefined {
  const trimmed = sizeStr.trim();

  // Skip empty or placeholder values
  if (trimmed === '' || trimmed === '-') {
    return undefined;
  }

  // Match number followed by optional unit
  // Supports: B, KB, KiB, MB, MiB, GB, GiB, TB, TiB
  const match = trimmed.match(/^([\d.]+)\s*([KMGT]?i?B)?$/i);
  if (match === null) {
    return undefined;
  }

  const value = parseFloat(match[1]!);
  if (Number.isNaN(value)) {
    return undefined;
  }

  const unit = (match[2] ?? 'B').toUpperCase();

  // Binary (IEC) units use 1024, decimal (SI) units use 1000
  // Most archive sites use binary units (KiB, MiB) or KB/MB meaning binary
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    KIB: 1024,
    MB: 1024 * 1024,
    MIB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
    GIB: 1024 * 1024 * 1024,
    TB: 1024 * 1024 * 1024 * 1024,
    TIB: 1024 * 1024 * 1024 * 1024,
  };

  const multiplier = multipliers[unit];
  if (multiplier === undefined) {
    return undefined;
  }

  return Math.round(value * multiplier);
}

/**
 * Parses an HTML page and extracts links from a table.
 *
 * Looks for:
 * - A table with the specified ID
 * - Rows containing <td class="link">
 * - Anchor tags within those cells
 * - File sizes from sibling <td class="size"> cells
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
    const $cell = $(cell);
    const anchor = $cell.find('a').first();

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

    // Extract file size from sibling td.size cell in the same row
    const row = $cell.parent('tr');
    const sizeCell = row.find('td.size').first();
    const sizeText = sizeCell.text().trim();
    const size = parseFileSize(sizeText);

    links.push({ href, text, size });
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
