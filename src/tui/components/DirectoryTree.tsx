/**
 * DirectoryTree component
 * Shows folder structure with tree characters
 */

import { Box, Text, useInput } from 'ink';
import { useState, useEffect } from 'react';
import { useTheme } from '../theme/index.js';
import {
  getVerticalNav,
  isConfirmKey,
  calculateNewIndex,
  calculateScrollOffset,
  calculateScrollbar,
  getScrollbarChar,
} from '../hooks/index.js';

/** A node in the directory tree */
export type TreeNode = {
  name: string;
  children?: TreeNode[];
};

type DirectoryTreeProps = {
  rootName: string;
  nodes: TreeNode[];
  selectedPath?: string;
  onSelect?: (path: string, node: FlatNode) => void;
  width?: number;
  maxRows?: number;
  isFocused?: boolean;
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

    result.push({ name: node.name, depth, isLast, parentLasts: [...parentLasts], path, hasChildren });

    if (hasChildren) {
      result.push(...flattenTree(node.children!, depth + 1, [...parentLasts, isLast], path));
    }
  });

  return result;
}

/** Generate tree prefix characters */
function getTreePrefix(node: FlatNode): string {
  let prefix = '';
  for (const isLast of node.parentLasts) {
    prefix += isLast ? '   ' : '│  ';
  }
  if (node.depth > 0) {
    prefix += node.isLast ? '└─ ' : '├─ ';
  }
  return prefix;
}

/** Create a root FlatNode */
function createRootNode(rootName: string): FlatNode {
  return { name: rootName, depth: -1, isLast: false, parentLasts: [], path: rootName, hasChildren: true };
}

/** Get node at given index or create root node */
function getNodeAt(index: number, flatNodes: FlatNode[], rootName: string): FlatNode {
  return index === -1 ? createRootNode(rootName) : flatNodes[index] ?? createRootNode(rootName);
}

/**
 * Tree view with keyboard navigation and selection.
 * Complexity from tree flattening, scrolling viewport, and selection tracking.
 */
// eslint-disable-next-line complexity
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

  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    if (selectedPath !== undefined) {
      const idx = flatNodes.findIndex((n) => n.path === selectedPath);
      if (idx !== -1) {setSelectedIndex(idx);}
    }
  }, [selectedPath, flatNodes]);

  useInput(
    (input, key) => {
      if (flatNodes.length === 0) {return;}

      if (isConfirmKey(input, key) && onSelect !== undefined) {
        const node = getNodeAt(selectedIndex, flatNodes, rootName);
        onSelect(node.path, node);
        return;
      }

      const direction = getVerticalNav(input, key);
      if (direction !== null) {
        const newIndex = calculateNewIndex(direction, selectedIndex, -1, flatNodes.length - 1);
        if (newIndex !== selectedIndex) {
          setSelectedIndex(newIndex);
          setScrollOffset(calculateScrollOffset(newIndex, scrollOffset, maxRows, 1));

          if (onSelect !== undefined) {
            const node = getNodeAt(newIndex, flatNodes, rootName);
            onSelect(node.path, node);
          }
        }
      }
    },
    { isActive: isFocused }
  );

  const totalItems = flatNodes.length + 1;
  const { hasScrollbar, thumbSize, thumbPosition } = calculateScrollbar(totalItems, maxRows, scrollOffset);
  const visibleStart = scrollOffset;
  const visibleEnd = scrollOffset + maxRows;

  return (
    <Box
      borderStyle="single"
      borderColor={isFocused ? theme.primary : theme.border}
      flexDirection="column"
      width={width}
      paddingX={1}
    >
      <Box marginTop={-1} marginLeft={-1}>
        <Text color={theme.primary} bold>Directory</Text>
      </Box>

      {nodes.length === 0 ? (
        <Box marginY={1}>
          <Text color={theme.warning}>{placeholder}</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          {visibleStart === 0 && (
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
              {hasScrollbar && <Text color={theme.muted}>{getScrollbarChar(0, thumbPosition, thumbSize)}</Text>}
            </Box>
          )}

          {flatNodes.map((node, index) => {
            const itemPos = index + 1;
            if (itemPos < visibleStart || itemPos >= visibleEnd) {return null;}

            const isSelected = index === selectedIndex;
            const viewIndex = itemPos - visibleStart;

            return (
              <Box key={`${index}-${node.path}`} width="100%">
                <Box flexGrow={1}>
                  <Text color={theme.muted}>{getTreePrefix(node)}</Text>
                  <Text
                    color={isSelected ? theme.primary : theme.foreground}
                    bold={isSelected}
                    inverse={isSelected && isFocused}
                  >
                    {node.name}/
                  </Text>
                </Box>
                {hasScrollbar && <Text color={theme.muted}>{getScrollbarChar(viewIndex, thumbPosition, thumbSize)}</Text>}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
