/**
 * RunSection component
 * Top bar with Command dropdown, Systems dropdown, and Send button
 * Layout: ┌─Run───────────────────────────────────────────────────────────┐
 *         │ Command: [ Download ▼ ]  Systems: [ Game Boy ▼ ]    [ Send ] │
 *         └───────────────────────────────────────────────────────────────┘
 */

import { Box, Text } from 'ink';
import { useTheme } from '../theme/index.js';
import { Select, type SelectOption } from './Select.js';
import { Button } from './Button.js';

/** Available commands */
export const COMMAND_OPTIONS: SelectOption[] = [
  { value: 'download', label: 'Download' },
  { value: 'scrape', label: 'Scrape' },
  { value: 'dedupe', label: 'Dedupe' },
  { value: 'purge', label: 'Purge' },
];

type RunSectionProps = {
  /** Selected command */
  command: string;
  /** Called when command changes */
  onCommandChange: (command: string) => void;
  /** System options (from config) */
  systemOptions: SelectOption[];
  /** Selected system */
  system: string;
  /** Called when system changes */
  onSystemChange: (system: string) => void;
  /** Called when Send is pressed */
  onSend: () => void;
  /** Which element is focused: 'command' | 'system' | 'send' | null */
  focusedElement: 'command' | 'system' | 'send' | null;
  /** Whether send is disabled */
  sendDisabled?: boolean;
};

/**
 * Run section with command/system selection and send button
 */
export function RunSection({
  command,
  onCommandChange,
  systemOptions,
  system,
  onSystemChange,
  onSend,
  focusedElement,
  sendDisabled = false,
}: RunSectionProps): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <Box
      borderStyle="single"
      borderColor={theme.border}
      paddingX={1}
      flexDirection="column"
    >
      {/* Title */}
      <Box marginTop={-1} marginLeft={-1}>
        <Text color={theme.primary} bold>
          Run
        </Text>
      </Box>

      {/* Controls row */}
      <Box flexDirection="row" gap={2}>
        <Select
          label="Command"
          options={COMMAND_OPTIONS}
          value={command}
          onChange={onCommandChange}
          width={14}
          isFocused={focusedElement === 'command'}
        />

        <Select
          label="Systems"
          options={systemOptions}
          value={system}
          onChange={onSystemChange}
          width={16}
          isFocused={focusedElement === 'system'}
        />

        <Box flexGrow={1} />

        <Button
          label="Send"
          onPress={onSend}
          isFocused={focusedElement === 'send'}
          disabled={sendDisabled}
        />
      </Box>
    </Box>
  );
}
