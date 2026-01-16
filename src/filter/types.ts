/**
 * Represents a parsed filter expression.
 * Each entry is an array of terms that must ALL match (AND).
 * The entries themselves are OR'ed together.
 *
 * Example: ["foo AND bar", "baz"] becomes:
 * [["foo", "bar"], ["baz"]]
 * Which means: (foo AND bar) OR (baz)
 */
export type FilterExpression = string[][];

export interface FilterConfig {
  whitelist: string[];
  blacklist: string[];
}

export interface FilterTarget {
  filename: string;
  linkText: string;
}
