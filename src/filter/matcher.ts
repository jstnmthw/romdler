import type { FilterConfig, FilterTarget, FilterExpression } from './types.js';
import { parseFilterExpression, matchesExpression } from './expression-parser.js';

/**
 * Applies whitelist and blacklist filters to a list of files.
 *
 * Filter matching is performed against both filename AND link text.
 * A match in either is considered a match.
 *
 * Logic:
 * 1. If blacklist matches -> exclude (always)
 * 2. If whitelist is empty -> include (unless blacklisted)
 * 3. If whitelist is non-empty -> include only if matches (and not blacklisted)
 */
export function applyFilters<T extends FilterTarget>(
  items: T[],
  config: FilterConfig
): T[] {
  const whitelistExpr = parseFilterExpression(config.whitelist);
  const blacklistExpr = parseFilterExpression(config.blacklist);

  return items.filter((item) => {
    // Combine filename and linkText for matching
    const searchText = `${item.filename} ${item.linkText}`;

    // Check blacklist first - always exclude matches
    if (blacklistExpr.length > 0 && matchesExpression(searchText, blacklistExpr)) {
      return false;
    }

    // If whitelist is empty, allow all (not blacklisted)
    if (whitelistExpr.length === 0) {
      return true;
    }

    // Check whitelist - must match to be included
    return matchesExpression(searchText, whitelistExpr);
  });
}

/**
 * Creates a filter function for use with Array.filter.
 */
export function createFilterFn(
  config: FilterConfig
): (item: FilterTarget) => boolean {
  const whitelistExpr = parseFilterExpression(config.whitelist);
  const blacklistExpr = parseFilterExpression(config.blacklist);

  return (item: FilterTarget): boolean => {
    const searchText = `${item.filename} ${item.linkText}`;

    if (blacklistExpr.length > 0 && matchesExpression(searchText, blacklistExpr)) {
      return false;
    }

    if (whitelistExpr.length === 0) {
      return true;
    }

    return matchesExpression(searchText, whitelistExpr);
  };
}

export { parseFilterExpression, matchesExpression };
export type { FilterExpression };
