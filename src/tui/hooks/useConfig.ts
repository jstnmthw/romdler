/**
 * Configuration hook for loading and accessing config
 */

import { useCallback } from 'react';
import { useAppState, useAppDispatch } from '../store/index.js';
import { loadConfig, resolveSystemConfig } from '../../config/index.js';
import type { Config, ResolvedSystemConfig } from '../../config/index.js';

type ConfigHook = {
  /** Loaded configuration (null if not loaded) */
  config: Config | null;
  /** Resolved system configurations */
  systems: ResolvedSystemConfig[];
  /** Whether config is loaded */
  isLoaded: boolean;
  /** Load configuration from file (throws on error) */
  load: (configPath?: string) => void;
};

/**
 * Hook for configuration management
 * @returns Config state and load function
 */
export function useConfig(): ConfigHook {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const load = useCallback(
    (configPath?: string) => {
      const config = loadConfig(configPath);
      const systems = config.systems.map((sys) =>
        resolveSystemConfig(sys, config)
      );
      dispatch({ type: 'SET_CONFIG', config, systems });
    },
    [dispatch]
  );

  return {
    config: state.config,
    systems: state.systems,
    isLoaded: state.config !== null,
    load,
  };
}
