/**
 * Menu component for command selection
 */

import { Box, Text, useInput } from 'ink';
import { useState, useEffect } from 'react';
import { useTheme } from '../theme/index.js';

/** A menu item definition */
export type MenuItem = {
  id: string;
  label: string;
  description?: string;
};

type MenuProps = {
  /** Menu items to display */
  items: MenuItem[];
  /** Callback when an item is selected */
  onSelect: (item: MenuItem) => void;
  /** Optional initial selection index */
  initialIndex?: number;
  /** Whether the menu is focused and accepting input */
  isFocused?: boolean;
};

/**
 * Vertical menu with keyboard navigation
 * Uses arrow keys or j/k for navigation, Enter to select
 */
export function Menu({
  items,
  onSelect,
  initialIndex = 0,
  isFocused = true,
}: MenuProps): React.JSX.Element {
  const { theme } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  // Reset selection if items change
  useEffect(() => {
    if (selectedIndex >= items.length) {
      setSelectedIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, selectedIndex]);

  useInput(
    (input, key) => {
      if (!isFocused) {
        return;
      }

      // Navigate up
      if (key.upArrow || input === 'k') {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
        return;
      }

      // Navigate down
      if (key.downArrow || input === 'j') {
        setSelectedIndex((prev) => Math.min(items.length - 1, prev + 1));
        return;
      }

      // Select item
      if (key.return) {
        const item = items[selectedIndex];
        if (item !== undefined) {
          onSelect(item);
        }
      }
    },
    { isActive: isFocused }
  );

  return (
    <Box flexDirection="column">
      {items.map((item, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Box key={item.id}>
            <Text
              color={isSelected ? theme.selectionForeground : theme.foreground}
              backgroundColor={isSelected ? theme.selection : undefined}
            >
              {isSelected ? '▸ ' : '  '}
              {item.label}
            </Text>
            {item.description !== undefined && item.description !== '' && (
              <Text color={theme.muted}> - {item.description}</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
