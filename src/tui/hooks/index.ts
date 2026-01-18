/**
 * Custom hooks exports
 */

export { useNavigation } from './useNavigation.js';
export { useConfig } from './useConfig.js';
export { useTask } from './useTask.js';

// Input handling utilities
export {
  // Key detection
  getVerticalNav,
  getHorizontalNav,
  getPageNav,
  getNavDirection,
  isConfirmKey,
  isCancelKey,
  // Index navigation
  calculateNewIndex,
  calculateScrollOffset,
  navigateList,
  // Scroll navigation
  calculateScrollNav,
  // Scrollbar
  calculateScrollbar,
  getScrollbarChar,
  // Cycling
  cycleValue,
  // Types
  type KeyInfo,
  type NavDirection,
  type NavResult,
  type ScrollbarMetrics,
} from './useInput.js';
