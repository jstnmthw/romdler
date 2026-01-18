/**
 * Button component
 * Renders as: [ Label ]
 */

import { Box, Text, useInput } from 'ink';
import { useTheme } from '../theme/index.js';

type ButtonProps = {
  /** Button label */
  label: string;
  /** Called when button is pressed (Enter/Space) */
  onPress: () => void;
  /** Whether this button is focused */
  isFocused?: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
};

/**
 * Pressable button component
 */
export function Button({
  label,
  onPress,
  isFocused = false,
  disabled = false,
}: ButtonProps): React.JSX.Element {
  const { theme } = useTheme();

  useInput(
    (input, key) => {
      if (!isFocused || disabled) {return;}

      if (key.return || input === ' ') {
        onPress();
      }
    },
    { isActive: isFocused && !disabled }
  );

  const borderColor = disabled
    ? theme.muted
    : isFocused
      ? theme.primary
      : theme.border;
  const textColor = disabled
    ? theme.muted
    : isFocused
      ? theme.primary
      : theme.foreground;

  return (
    <Box>
      <Text color={borderColor}>[</Text>
      <Text color={textColor}> {label} </Text>
      <Text color={borderColor}>]</Text>
    </Box>
  );
}
