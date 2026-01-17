import { ScrollingLog } from './scrolling-log.js';

/**
 * Options for ProgressRenderer.
 */
export type ProgressRendererOptions = {
  /** Maximum lines to display in scrolling mode (default: 8) */
  maxLines?: number;
};

/**
 * A wrapper around ScrollingLog that handles TTY detection automatically.
 * In TTY mode, shows a scrolling window of recent lines.
 * In non-TTY mode, outputs each line directly to console.
 *
 * Usage:
 * ```ts
 * const renderer = new ProgressRenderer();
 * for (const item of items) {
 *   renderer.addLine(`Processing ${item.name}`);
 * }
 * renderer.done();
 * ```
 */
export class ProgressRenderer {
  private scrollingLog: ScrollingLog | null;
  private isTTY: boolean;

  constructor(options: ProgressRendererOptions = {}) {
    this.isTTY = process.stdout.isTTY === true;
    this.scrollingLog = this.isTTY
      ? new ScrollingLog({ maxLines: options.maxLines ?? 8, persistOnDone: false })
      : null;
  }

  /**
   * Adds a line to the output.
   * In TTY mode, updates the scrolling display.
   * In non-TTY mode, prints directly to console.
   */
  addLine(line: string): void {
    if (this.scrollingLog !== null) {
      this.scrollingLog.addLine(line);
    } else {
      console.log(line);
    }
  }

  /**
   * Sets the progress bar line (displayed below scrolling lines).
   * Only works in TTY mode.
   */
  setProgress(progressLine: string): void {
    if (this.scrollingLog !== null) {
      this.scrollingLog.setProgress(progressLine);
    }
  }

  /**
   * Clears the progress bar line.
   */
  clearProgress(): void {
    if (this.scrollingLog !== null) {
      this.scrollingLog.clearProgress();
    }
  }

  /**
   * Finalizes the output. Must be called when done adding lines.
   */
  done(): void {
    if (this.scrollingLog !== null) {
      this.scrollingLog.done();
    }
  }

  /**
   * Returns whether we're in TTY mode.
   */
  get isInteractive(): boolean {
    return this.isTTY;
  }
}

/**
 * Creates a new ProgressRenderer instance.
 */
export function createProgressRenderer(options?: ProgressRendererOptions): ProgressRenderer {
  return new ProgressRenderer(options);
}
