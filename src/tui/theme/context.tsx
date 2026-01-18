/**
 * Theme context provider for the TUI
 * Provides theme tokens to all child components via React Context
 */

import { createContext, useContext, useState, type ReactNode } from 'react';
import { themes, DEFAULT_THEME, type ThemeName } from './themes.js';
import type { ThemeTokens } from './tokens.js';

type ThemeContextValue = {
  /** Current theme tokens */
  theme: ThemeTokens;
  /** Current theme name */
  themeName: ThemeName;
  /** Change the active theme */
  setTheme: (name: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
  initialTheme?: ThemeName;
};

/**
 * Provider component that makes theme tokens available to all children
 * @param children - Child components
 * @param initialTheme - Starting theme name (defaults to 'hacker')
 */
export function ThemeProvider({
  children,
  initialTheme = DEFAULT_THEME,
}: ThemeProviderProps): React.JSX.Element {
  const [themeName, setThemeName] = useState<ThemeName>(initialTheme);

  const value: ThemeContextValue = {
    theme: themes[themeName],
    themeName,
    setTheme: setThemeName,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * Hook to access theme tokens from any component
 * @returns Theme context value with tokens and setter
 * @throws Error if used outside ThemeProvider
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
