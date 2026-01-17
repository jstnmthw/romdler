import logUpdate from 'log-update';

/**
 * Options for configuring the scrolling log display.
 */
export type ScrollingLogOptions = {
  /** Maximum number of lines to display (default: 8) */
  maxLines?: number;
  /** Whether to persist lines when done (default: true) */
  persistOnDone?: boolean;
};

/**
 * A terminal UI component that displays a scrolling window of log lines.
 * Only the most recent N lines are shown, with older lines scrolling off.
 * Uses log-update for in-place terminal updates.
 */
export class ScrollingLog {
  private lines: string[] = [];
  private maxLines: number;
  private persistOnDone: boolean;
  private progressLine: string | null = null;
  private isTTY: boolean;

  constructor(options: ScrollingLogOptions = {}) {
    this.maxLines = options.maxLines ?? 8;
    this.persistOnDone = options.persistOnDone ?? true;
    this.isTTY = process.stdout.isTTY === true;
  }

  /**
   * Adds a new line to the scrolling log.
   * If we exceed maxLines, the oldest line is removed.
   */
  addLine(line: string): void {
    // In non-TTY mode, just print directly
    if (!this.isTTY) {
      console.log(line);
      return;
    }

    this.lines.push(line);

    // Keep only the last maxLines
    if (this.lines.length > this.maxLines) {
      this.lines.shift();
    }

    this.render();
  }

  /**
   * Sets the progress bar line to display below the log lines.
   */
  setProgress(progressLine: string | null): void {
    if (!this.isTTY) {
      return;
    }
    this.progressLine = progressLine;
    this.render();
  }

  /**
   * Clears the progress line.
   */
  clearProgress(): void {
    this.progressLine = null;
    // Don't re-render here - let the next addLine handle it
  }

  /**
   * Adds a line and updates progress in a single render (prevents flickering).
   */
  addLineWithProgress(line: string, progressLine: string | null): void {
    if (!this.isTTY) {
      console.log(line);
      return;
    }

    this.lines.push(line);
    if (this.lines.length > this.maxLines) {
      this.lines.shift();
    }

    this.progressLine = progressLine;
    this.render();
  }

  /**
   * Renders the current state to the terminal.
   */
  private render(): void {
    const output: string[] = [...this.lines];

    if (this.progressLine !== null) {
      // Indent to align with log entries (which have status icon + space)
      output.push(`  ${this.progressLine}`);
    }

    logUpdate(output.join('\n'));
  }

  /**
   * Finalizes the log output, persisting it if configured.
   */
  done(): void {
    if (!this.isTTY) {
      return;
    }

    if (this.persistOnDone) {
      logUpdate.done();
    } else {
      logUpdate.clear();
    }

    this.lines = [];
    this.progressLine = null;
  }

  /**
   * Clears the scrolling log without persisting.
   */
  clear(): void {
    if (!this.isTTY) {
      return;
    }

    logUpdate.clear();
    this.lines = [];
    this.progressLine = null;
  }

  /**
   * Returns the current number of lines in the buffer.
   */
  get lineCount(): number {
    return this.lines.length;
  }
}

/**
 * Creates a new scrolling log instance.
 */
export function createScrollingLog(options?: ScrollingLogOptions): ScrollingLog {
  return new ScrollingLog(options);
}
