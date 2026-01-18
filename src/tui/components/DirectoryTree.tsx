/**
 * DirectoryTree component
 * Shows folder structure with tree characters
 * Layout: ┌─Directory──────────────────┐
 *         │ downloads/                 █
 *         │  └─ Roms/                  ░
 *         │    ├─ GB/                  ░
 *         │    ├─ GBC/                 ░
 *         │    │ ├── deleted/          ░
 *         │    │ └── Imgs/             ░
 *         │    └─ SNES/                ░
 *         └────────────────────────────┘
 */

import { Box, Text, useInput } from 'ink';
import { useState, useEffect } from 'react';
import { useTheme } from '../theme/index.js';

/** A node in the directory tree */
export type TreeNode = {
  name: string;
  children?: TreeNode[];
};

type DirectoryTreeProps = {
  /** Root directory name */
  rootName: string;
  /** Tree structure */
  nodes: TreeNode[];
  /** Selected node path */
  selectedPath?: string;
  /** Called when a node is selected */
  onSelect?: (path: string, node: FlatNode) => void;
  /** Box width */
  width?: number;
  /** Max visible rows (for scrolling) */
  maxRows?: number;
  /** Whether this component is focused */
  isFocused?: boolean;
  /** Placeholder text when no nodes */
  placeholder?: string;
};

export type FlatNode = {
  name: string;
  depth: number;
  isLast: boolean;
  parentLasts: boolean[];
  path: string;
  hasChildren: boolean;
};

/** Flatten tree for rendering */
function flattenTree(
  nodes: TreeNode[],
  depth: number = 0,
  parentLasts: boolean[] = [],
  parentPath: string = ''
): FlatNode[] {
  const result: FlatNode[] = [];

  nodes.forEach((node, index) => {
    const isLast = index === nodes.length - 1;
    const path = parentPath !== '' ? `${parentPath}/${node.name}` : node.name;
    const hasChildren = node.children !== undefined && node.children.length > 0;

    result.push({
      name: node.name,
      depth,
      isLast,
      parentLasts: [...parentLasts],
      path,
      hasChildren,
    });

    if (hasChildren) {
      result.push(...flattenTree(node.children!, depth + 1, [...parentLasts, isLast], path));
    }
  });

  return result;
}

/** Generate tree prefix characters */
function getTreePrefix(node: FlatNode): string {
  let prefix = '';

  // Add vertical lines for parent levels
  for (const isLast of node.parentLasts) {
    prefix += isLast ? '   ' : '│  ';
  }

  // Add branch character for this level
  if (node.depth > 0) {
    prefix += node.isLast ? '└─ ' : '├─ ';
  }

  return prefix;
}

/**
 * Directory tree view component with keyboard navigation
 */
export function DirectoryTree({
  rootName,
  nodes,
  selectedPath,
  onSelect,
  width = 28,
  maxRows = 8,
  isFocused = false,
  placeholder = '[ Set download dir in Config ]',
}: DirectoryTreeProps): React.JSX.Element {
  const { theme } = useTheme();
  const flatNodes = flattenTree(nodes);

  // Selection state - -1 means root is selected
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Sync selectedIndex with selectedPath prop
  useEffect(() => {
    if (selectedPath !== undefined) {
      const idx = flatNodes.findIndex((n) => n.path === selectedPath);
      if (idx !== -1) {
        setSelectedIndex(idx);
      }
    }
  }, [selectedPath, flatNodes]);

  // Handle keyboard navigation
  useInput(
    (input, key) => {
      if (flatNodes.length === 0) {return;}

      let newIndex = selectedIndex;

      if (key.upArrow || input === 'k') {
        // -1 is root, then 0...n-1 are tree nodes
        newIndex = Math.max(-1, selectedIndex - 1);
      } else if (key.downArrow || input === 'j') {
        newIndex = Math.min(flatNodes.length - 1, selectedIndex + 1);
      } else if (key.return && onSelect !== undefined) {
        // Select current item
        if (selectedIndex === -1) {
          // Root selected
          onSelect(rootName, { name: rootName, depth: -1, isLast: false, parentLasts: [], path: rootName, hasChildren: true });
        } else {
          const node = flatNodes[selectedIndex];
          if (node !== undefined) {
            onSelect(node.path, node);
          }
        }
        return;
      }

      if (newIndex !== selectedIndex) {
        setSelectedIndex(newIndex);

        // Adjust scroll to keep selection visible (account for root at -1)
        const visibleIndex = newIndex + 1; // +1 because root takes first slot
        if (visibleIndex < scrollOffset) {
          setScrollOffset(Math.max(0, visibleIndex));
        } else if (visibleIndex >= scrollOffset + maxRows) {
          setScrollOffset(visibleIndex - maxRows + 1);
        }

        // Auto-select on navigation for immediate feedback
        if (onSelect !== undefined) {
          if (newIndex === -1) {
            onSelect(rootName, { name: rootName, depth: -1, isLast: false, parentLasts: [], path: rootName, hasChildren: true });
          } else {
            const node = flatNodes[newIndex];
            if (node !== undefined) {
              onSelect(node.path, node);
            }
          }
        }
      }
    },
    { isActive: isFocused }
  );

  // Total items including root
  const totalItems = flatNodes.length + 1;
  const hasScrollbar = totalItems > maxRows;

  // Calculate scrollbar
  const thumbSize = Math.max(1, Math.floor((maxRows / Math.max(1, totalItems)) * maxRows));
  const maxScrollOffset = Math.max(1, totalItems - maxRows);
  const thumbPosition = Math.floor((scrollOffset / maxScrollOffset) * (maxRows - thumbSize));

  // Get visible items
  const visibleStartIndex = scrollOffset;
  const visibleEndIndex = scrollOffset + maxRows;

  return (
    <Box
      borderStyle="single"
      borderColor={isFocused ? theme.primary : theme.border}
      flexDirection="column"
      width={width}
      paddingX={1}
    >
      {/* Title */}
      <Box marginTop={-1} marginLeft={-1}>
        <Text color={theme.primary} bold>
          Directory
        </Text>
      </Box>

      {/* Content */}
      {nodes.length === 0 ? (
        <Box marginY={1}>
          <Text color={theme.warning}>{placeholder}</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          {/* Root - only show if in visible range */}
          {visibleStartIndex === 0 && (
            <Box width="100%">
              <Box flexGrow={1}>
                <Text
                  color={selectedIndex === -1 ? theme.primary : theme.foreground}
                  bold={selectedIndex === -1}
                  inverse={selectedIndex === -1 && isFocused}
                >
                  {rootName}/
                </Text>
              </Box>
              {hasScrollbar && (
                <Text color={theme.muted}>
                  {0 >= thumbPosition && 0 < thumbPosition + thumbSize ? '█' : '░'}
                </Text>
              )}
            </Box>
          )}

          {/* Tree nodes */}
          {flatNodes.map((node, index) => {
            // Calculate visible position (index + 1 because root is at position 0)
            const itemPosition = index + 1;
            if (itemPosition < visibleStartIndex || itemPosition >= visibleEndIndex) {
              return null;
            }

            const prefix = getTreePrefix(node);
            const isSelected = index === selectedIndex;
            const viewIndex = itemPosition - visibleStartIndex;

            return (
              <Box key={`${index}-${node.path}`} width="100%">
                <Box flexGrow={1}>
                  <Text color={theme.muted}>{prefix}</Text>
                  <Text
                    color={isSelected ? theme.primary : theme.foreground}
                    bold={isSelected}
                    inverse={isSelected && isFocused}
                  >
                    {node.name}/
                  </Text>
                </Box>
                {hasScrollbar && (
                  <Text color={theme.muted}>
                    {viewIndex >= thumbPosition && viewIndex < thumbPosition + thumbSize ? '█' : '░'}
                  </Text>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
