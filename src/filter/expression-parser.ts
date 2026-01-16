import type { FilterExpression } from './types.js';

/**
 * Parses an array of filter strings into a FilterExpression.
 *
 * Each string can contain "AND" to require multiple terms.
 * Multiple strings are OR'ed together.
 *
 * Examples:
 * - ["foo"] => match "foo"
 * - ["foo", "bar"] => match "foo" OR "bar"
 * - ["foo AND bar"] => match "foo" AND "bar"
 * - ["foo AND bar", "baz"] => match ("foo" AND "bar") OR "baz"
 *
 * Terms are case-insensitive and trimmed of whitespace.
 */
export function parseFilterExpression(filters: string[]): FilterExpression {
  if (filters.length === 0) {
    return [];
  }

  return filters.map((entry) => {
    // Split by " AND " (case-insensitive)
    const parts = entry.split(/\s+AND\s+/i);

    // Trim and lowercase each term, filter out empty strings
    return parts
      .map((term) => term.trim().toLowerCase())
      .filter((term) => term !== '');
  }).filter((terms) => terms.length > 0);
}

/**
 * Checks if a target string matches a filter expression.
 *
 * @param target - The string to match against (will be lowercased)
 * @param expression - The parsed filter expression
 * @returns true if any OR clause matches (where all AND terms in that clause match)
 */
export function matchesExpression(
  target: string,
  expression: FilterExpression
): boolean {
  if (expression.length === 0) {
    return false;
  }

  const lowerTarget = target.toLowerCase();
  return matchesExpressionLower(lowerTarget, expression);
}

/**
 * Checks if a pre-lowercased target string matches a filter expression.
 * More efficient when matching multiple times against different expressions.
 *
 * @param lowerTarget - The string to match against (must already be lowercased)
 * @param expression - The parsed filter expression
 * @returns true if any OR clause matches (where all AND terms in that clause match)
 */
export function matchesExpressionLower(
  lowerTarget: string,
  expression: FilterExpression
): boolean {
  if (expression.length === 0) {
    return false;
  }

  // OR across entries: if any entry matches, return true
  return expression.some((andTerms) => {
    // AND within entry: all terms must match
    return andTerms.every((term) => lowerTarget.includes(term));
  });
}
