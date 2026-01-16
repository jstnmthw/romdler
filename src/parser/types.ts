export interface ParsedLink {
  /** The href attribute value */
  href: string;
  /** The visible text of the link */
  text: string;
}

export interface ParseResult {
  /** Whether the table was found */
  tableFound: boolean;
  /** Links extracted from the table */
  links: ParsedLink[];
}
