/**
 * ScrollableList component
 * Scrollable list with scrollbar indicator
 */

import { Box, Text, useInput } from 'ink';
import { useState, useEffect, type ReactNode } from 'react';
import { useTheme } from '../theme/index.js';
import {
  getNavDirection,
  isConfirmKey,
  navigateList,
  calculateScrollbar,
  getScrollbarChar,
} from '../hooks/index.js';

type ScrollableListProps<T> = {
  /** Items to display */
  items: T[];
  /** Render function for each item */
  renderItem: (item: T, index: number, isSelected: boolean) => ReactNode;
  /** Key extractor for React keys */
  keyExtractor: (item: T, index: number) => string;
  /** Max visible rows */
  maxRows?: number;
  /** Whether the list is focused */
  isFocused?: boolean;
  /** Called when selection changes */
  onSelectionChange?: (index: number, item: T) => void;
  /** Called when Enter is pressed on selection */
  onSelect?: (index: number, item: T) => void;
  /** Initial selected index */
  initialIndex?: number;
  /** Show scrollbar */
  showScrollbar?: boolean;
  /** Empty state content */
  emptyContent?: ReactNode;
};

/**
 * Scrollable list with keyboard navigation
 */
export function ScrollableList<T>({
  items,
  renderItem,
  keyExtractor,
  maxRows = 10,
  isFocused = false,
  onSelectionChange,
  onSelect,
  initialIndex = 0,
  showScrollbar = true,
  emptyContent,
}: ScrollableListProps<T>): React.JSX.Element {
  const { theme } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Reset scroll when items change
  useEffect(() => {
    if (selectedIndex >= items.length) {
      setSelectedIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, selectedIndex]);

  // Handle keyboard navigation
  useInput(
    (input, key) => {
      if (!isFocused || items.length === 0) {
        return;
      }

      if (isConfirmKey(input, key) && onSelect !== undefined) {
        const item = items[selectedIndex];
        if (item !== undefined) {
          onSelect(selectedIndex, item);
        }
        return;
      }

      const direction = getNavDirection(input, key);
      if (direction !== null) {
        const result = navigateList(
          direction,
          selectedIndex,
          scrollOffset,
          0,
          items.length - 1,
          maxRows
        );
        if (result.index !== selectedIndex) {
          setSelectedIndex(result.index);
          setScrollOffset(result.scrollOffset);

          const item = items[result.index];
          if (onSelectionChange !== undefined && item !== undefined) {
            onSelectionChange(result.index, item);
          }
        }
      }
    },
    { isActive: isFocused }
  );

  // Empty state
  if (items.length === 0) {
    return (
      <Box flexDirection="column">{emptyContent ?? <Text color={theme.muted}>No items</Text>}</Box>
    );
  }

  // Calculate visible items
  const visibleItems = items.slice(scrollOffset, scrollOffset + maxRows);
  const hasScrollbar = showScrollbar && items.length > maxRows;
  const { thumbSize, thumbPosition } = calculateScrollbar(items.length, maxRows, scrollOffset);

  return (
    <Box flexDirection="column">
      {visibleItems.map((item, viewIndex) => {
        const actualIndex = scrollOffset + viewIndex;
        const isSelected = actualIndex === selectedIndex;
        const key = keyExtractor(item, actualIndex);

        return (
          <Box key={key} flexDirection="row">
            <Box flexGrow={1}>{renderItem(item, actualIndex, isSelected)}</Box>
            {hasScrollbar && (
              <Text color={theme.muted}>
                {getScrollbarChar(viewIndex, thumbPosition, thumbSize)}
              </Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
