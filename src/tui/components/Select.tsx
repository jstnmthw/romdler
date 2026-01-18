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
      if (!isFocused) {return;}

      if (key.return || input === ' ') {
        setIsOpen(!isOpen);
        return;
      }

      if (isOpen) {
        if (key.upArrow || input === 'k') {
          const newIndex = Math.max(0, currentIndex - 1);
          const newOption = options[newIndex];
          if (newOption !== undefined) {
            onChange(newOption.value);
          }
        } else if (key.downArrow || input === 'j') {
          const newIndex = Math.min(options.length - 1, currentIndex + 1);
          const newOption = options[newIndex];
          if (newOption !== undefined) {
            onChange(newOption.value);
          }
        } else if (key.escape) {
          setIsOpen(false);
        }
      } else {
        // When closed, arrows also cycle through options
        if (key.upArrow || input === 'k') {
          const newIndex = Math.max(0, currentIndex - 1);
          const newOption = options[newIndex];
          if (newOption !== undefined) {
            onChange(newOption.value);
          }
        } else if (key.downArrow || input === 'j') {
          const newIndex = Math.min(options.length - 1, currentIndex + 1);
          const newOption = options[newIndex];
          if (newOption !== undefined) {
            onChange(newOption.value);
          }
        }
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
      {label !== undefined && label !== '' && (
        <Text color={theme.muted}>{label}: </Text>
      )}
      <Text color={borderColor}>[</Text>
      <Text color={textColor}> {paddedText} </Text>
      <Text color={borderColor}>▼</Text>
      <Text color={borderColor}>]</Text>
    </Box>
  );
}
