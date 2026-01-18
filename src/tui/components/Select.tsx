/**
 * Select/Dropdown component
 * Renders as: [ Selected Item ▼ ]
 */

import { Box, Text, useInput } from 'ink';
import { useState } from 'react';
import { useTheme } from '../theme/index.js';

export type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  /** Available options */
  options: SelectOption[];
  /** Currently selected value */
  value: string;
  /** Called when selection changes */
  onChange: (value: string) => void;
  /** Width of the select box */
  width?: number;
  /** Whether this select is focused */
  isFocused?: boolean;
  /** Label shown before the select */
  label?: string;
};

/** Navigate to adjacent option and call onChange if valid */
function navigateOption(
  direction: 'up' | 'down',
  currentIndex: number,
  options: SelectOption[],
  onChange: (value: string) => void
): void {
  const newIndex =
    direction === 'up'
      ? Math.max(0, currentIndex - 1)
      : Math.min(options.length - 1, currentIndex + 1);
  const newOption = options[newIndex];
  if (newOption !== undefined) {
    onChange(newOption.value);
  }
}

/** Check if input is navigation key */
function isNavKey(
  input: string,
  key: { upArrow: boolean; downArrow: boolean }
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
 * Dropdown select component
 * When focused, use up/down arrows to change selection
 */
export function Select({
  options,
  value,
  onChange,
  width = 16,
  isFocused = false,
  label,
}: SelectProps): React.JSX.Element {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const currentIndex = options.findIndex((opt) => opt.value === value);
  const currentOption = options[currentIndex];
  const displayText = currentOption?.label ?? value;

  useInput(
    (input, key) => {
      if (!isFocused) {
        return;
      }

      if (key.return || input === ' ') {
        setIsOpen(!isOpen);
        return;
      }

      if (isOpen && key.escape) {
        setIsOpen(false);
        return;
      }

      const direction = isNavKey(input, key);
      if (direction !== null) {
        navigateOption(direction, currentIndex, options, onChange);
      }
    },
    { isActive: isFocused }
  );

  // Pad or truncate display text to fit width
  const innerWidth = width - 4; // Account for [ ] and ▼
  const paddedText =
    displayText.length > innerWidth
      ? displayText.slice(0, innerWidth - 2) + '..'
      : displayText.padEnd(innerWidth);

  const borderColor = isFocused ? theme.primary : theme.border;
  const textColor = isFocused ? theme.primary : theme.foreground;

  return (
    <Box>
      {label !== undefined && label !== '' && <Text color={theme.muted}>{label}: </Text>}
      <Text color={borderColor}>[</Text>
      <Text color={textColor}> {paddedText} </Text>
      <Text color={borderColor}>▼</Text>
      <Text color={borderColor}>]</Text>
    </Box>
  );
}
