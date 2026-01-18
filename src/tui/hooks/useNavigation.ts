/**
 * Navigation hook for screen management
 */

import { useCallback } from 'react';
import { useAppState, useAppDispatch, type Screen } from '../store/index.js';

type NavigationHook = {
  /** Current screen */
  currentScreen: Screen;
  /** Navigate to a screen */
  navigate: (screen: Screen) => void;
  /** Go back to home screen */
  goHome: () => void;
  /** Check if on home screen */
  isHome: boolean;
};

/**
 * Hook for screen navigation
 * @returns Navigation state and functions
 */
export function useNavigation(): NavigationHook {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const navigate = useCallback(
    (screen: Screen) => {
      dispatch({ type: 'NAVIGATE', screen });
    },
    [dispatch]
  );

  const goHome = useCallback(() => {
    dispatch({ type: 'NAVIGATE', screen: 'home' });
  }, [dispatch]);

  return {
    currentScreen: state.screen,
    navigate,
    goHome,
    isHome: state.screen === 'home',
  };
}
