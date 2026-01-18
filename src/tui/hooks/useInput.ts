/**
 * Shared input handling utilities for TUI components
 *
 * These utilities standardize keyboard navigation patterns across components,
 * making behavior consistent and reducing code duplication.
 */

// ============================================================================
// Types
// ============================================================================

/** Ink's key object shape (subset we use) */
export type KeyInfo = {
  upArrow: boolean;
  downArrow: boolean;
  leftArrow: boolean;
  rightArrow: boolean;
  pageUp: boolean;
  pageDown: boolean;
  return: boolean;
  escape: boolean;
  tab: boolean;
  shift: boolean;
  ctrl: boolean;
};

/** Direction for navigation */
export type NavDirection = 'up' | 'down' | 'left' | 'right' | 'pageUp' | 'pageDown';

/** Result of navigation calculation */
export type NavResult = {
  index: number;
  scrollOffset: number;
};

// ============================================================================
// Key Detection
// ============================================================================

/**
 * Check if input is a vertical navigation key (up/down/j/k)
 * @returns 'up' | 'down' | null
 */
export function getVerticalNav(
  input: string,
  key: Pick<KeyInfo, 'upArrow' | 'downArrow'>
): 'up' | 'down' | null {
  if (key.upArrow || input === 'k') {
    return 'up';
  }
  if (key.downArrow || input === 'j') {
    return 'down';
  }
  return null;
}

/**
 * Check if input is a horizontal navigation key (left/right/h/l)
 * @returns 'left' | 'right' | null
 */
export function getHorizontalNav(
  input: string,
  key: Pick<KeyInfo, 'leftArrow' | 'rightArrow'>
): 'left' | 'right' | null {
  if (key.leftArrow || input === 'h') {
    return 'left';
  }
  if (key.rightArrow || input === 'l') {
    return 'right';
  }
  return null;
}

/**
 * Check if input is a page navigation key
 * @returns 'pageUp' | 'pageDown' | null
 */
export function getPageNav(
  key: Pick<KeyInfo, 'pageUp' | 'pageDown'>
): 'pageUp' | 'pageDown' | null {
  if (key.pageUp) {
    return 'pageUp';
  }
  if (key.pageDown) {
    return 'pageDown';
  }
  return null;
}

/**
 * Get full navigation direction from input
 */
export function getNavDirection(
  input: string,
  key: Pick<KeyInfo, 'upArrow' | 'downArrow' | 'pageUp' | 'pageDown'>
): NavDirection | null {
  const vertical = getVerticalNav(input, key);
  if (vertical !== null) {
    return vertical;
  }
  return getPageNav(key);
}

/**
 * Check if this is a confirm/select key (Enter/Space)
 */
export function isConfirmKey(input: string, key: Pick<KeyInfo, 'return'>): boolean {
  return key.return || input === ' ';
}

/**
 * Check if this is a cancel key (Escape)
 */
export function isCancelKey(key: Pick<KeyInfo, 'escape'>): boolean {
  return key.escape;
}

// ============================================================================
// Index Navigation
// ============================================================================

/**
 * Calculate new index after navigation
 * @param direction - Navigation direction
 * @param currentIndex - Current selected index
 * @param minIndex - Minimum valid index (usually 0 or -1 for "none")
 * @param maxIndex - Maximum valid index (usually items.length - 1)
 * @param pageSize - Number of items to jump for page navigation
 * @returns New index, clamped to valid range
 */
export function calculateNewIndex(
  direction: NavDirection,
  currentIndex: number,
  minIndex: number,
  maxIndex: number,
  pageSize: number = 1
): number {
  switch (direction) {
    case 'up':
      return Math.max(minIndex, currentIndex - 1);
    case 'down':
      return Math.min(maxIndex, currentIndex + 1);
    case 'pageUp':
      return Math.max(minIndex, currentIndex - pageSize);
    case 'pageDown':
      return Math.min(maxIndex, currentIndex + pageSize);
    default:
      return currentIndex;
  }
}

/**
 * Calculate new scroll offset after index change
 * Keeps the selected item visible within the viewport
 *
 * @param selectedIndex - Currently selected index
 * @param currentOffset - Current scroll offset
 * @param viewportSize - Number of visible items
 * @param indexOffset - Offset to add to index (e.g., 1 if there's a header row)
 * @returns New scroll offset
 */
export function calculateScrollOffset(
  selectedIndex: number,
  currentOffset: number,
  viewportSize: number,
  indexOffset: number = 0
): number {
  const visibleIndex = selectedIndex + indexOffset;

  // Selected item is above viewport - scroll up
  if (visibleIndex < currentOffset) {
    return Math.max(0, visibleIndex);
  }

  // Selected item is below viewport - scroll down
  if (visibleIndex >= currentOffset + viewportSize) {
    return visibleIndex - viewportSize + 1;
  }

  // Selected item is visible - no change
  return currentOffset;
}

/**
 * Combined navigation: calculate both new index and scroll offset
 */
export function navigateList(
  direction: NavDirection,
  currentIndex: number,
  currentOffset: number,
  minIndex: number,
  maxIndex: number,
  viewportSize: number,
  pageSize: number = viewportSize,
  indexOffset: number = 0
): NavResult {
  const newIndex = calculateNewIndex(direction, currentIndex, minIndex, maxIndex, pageSize);
  const newOffset = calculateScrollOffset(newIndex, currentOffset, viewportSize, indexOffset);
  return { index: newIndex, scrollOffset: newOffset };
}

// ============================================================================
// Scroll-Only Navigation (for non-selectable lists)
// ============================================================================

/**
 * Calculate new scroll offset for scroll-only navigation (no selection)
 * @param direction - Navigation direction
 * @param currentOffset - Current scroll offset
 * @param maxOffset - Maximum scroll offset (itemCount - viewportSize)
 * @param pageSize - Number of items to scroll for page navigation
 * @returns New scroll offset
 */
export function calculateScrollNav(
  direction: NavDirection,
  currentOffset: number,
  maxOffset: number,
  pageSize: number
): number {
  switch (direction) {
    case 'up':
      return Math.max(0, currentOffset - 1);
    case 'down':
      return Math.min(maxOffset, currentOffset + 1);
    case 'pageUp':
      return Math.max(0, currentOffset - pageSize);
    case 'pageDown':
      return Math.min(maxOffset, currentOffset + pageSize);
    default:
      return currentOffset;
  }
}

// ============================================================================
// Scrollbar Calculations
// ============================================================================

/** Scrollbar metrics */
export type ScrollbarMetrics = {
  hasScrollbar: boolean;
  thumbSize: number;
  thumbPosition: number;
};

/**
 * Calculate scrollbar metrics
 * @param itemCount - Total number of items
 * @param viewportSize - Number of visible items
 * @param scrollOffset - Current scroll offset
 * @returns Scrollbar metrics
 */
export function calculateScrollbar(
  itemCount: number,
  viewportSize: number,
  scrollOffset: number
): ScrollbarMetrics {
  const hasScrollbar = itemCount > viewportSize;

  if (!hasScrollbar) {
    return { hasScrollbar: false, thumbSize: 0, thumbPosition: 0 };
  }

  const scrollRatio = viewportSize / Math.max(1, itemCount);
  const thumbSize = Math.max(1, Math.floor(scrollRatio * viewportSize));
  const maxOffset = Math.max(1, itemCount - viewportSize);
  const thumbPosition = Math.floor((scrollOffset / maxOffset) * (viewportSize - thumbSize));

  return { hasScrollbar, thumbSize, thumbPosition };
}

/**
 * Get scrollbar character for a given row
 * @param rowIndex - Row index within viewport (0-based)
 * @param thumbPosition - Starting position of thumb
 * @param thumbSize - Size of thumb in rows
 * @returns Scrollbar character
 */
export function getScrollbarChar(
  rowIndex: number,
  thumbPosition: number,
  thumbSize: number
): string {
  return rowIndex >= thumbPosition && rowIndex < thumbPosition + thumbSize ? '█' : '░';
}

// ============================================================================
// Cycling Navigation
// ============================================================================

/**
 * Cycle through a list of values
 * @param current - Current value
 * @param values - Array of possible values
 * @param direction - 1 for forward, -1 for backward
 * @returns Next value in cycle
 */
export function cycleValue<T>(current: T, values: readonly T[], direction: 1 | -1 = 1): T {
  const currentIndex = values.indexOf(current);
  if (currentIndex === -1) {
    return values[0] as T;
  }
  const nextIndex = (currentIndex + direction + values.length) % values.length;
  return values[nextIndex] as T;
}
