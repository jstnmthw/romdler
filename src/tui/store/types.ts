/**
 * State management types for the TUI
 */

import type { Config, ResolvedSystemConfig } from '../../config/index.js';

/** Available screens in the TUI */
export type Screen = 'home' | 'download' | 'scrape' | 'dedupe' | 'purge' | 'settings';

/** Task execution status */
export type TaskStatus = 'idle' | 'running' | 'complete' | 'error';

/** Download progress data */
export type DownloadProgress = {
  filename: string;
  bytesDownloaded: number;
  totalBytes: number | null;
  percentage: number | null;
};

/** Task statistics */
export type TaskStats = {
  found: number;
  filtered: number;
  downloaded: number;
  skipped: number;
  failed: number;
};

/** Log entry for the scrolling log */
export type LogEntry = {
  id: string;
  timestamp: Date;
  status: 'downloaded' | 'skipped' | 'failed' | 'info';
  message: string;
  details?: string;
};

/** Application state */
export type AppState = {
  /** Currently active screen */
  screen: Screen;
  /** Loaded configuration (null if not loaded) */
  config: Config | null;
  /** Resolved system configurations */
  systems: ResolvedSystemConfig[];
  /** Currently selected system index */
  selectedSystemIndex: number;
  /** Current task status */
  taskStatus: TaskStatus;
  /** Current download progress (when downloading) */
  currentProgress: DownloadProgress | null;
  /** Task statistics */
  stats: TaskStats;
  /** Log entries */
  log: LogEntry[];
  /** Last error message */
  lastError: string | null;
  /** Whether dry-run mode is enabled */
  dryRun: boolean;
};

/** State update actions */
export type AppAction =
  | { type: 'NAVIGATE'; screen: Screen }
  | { type: 'SET_CONFIG'; config: Config; systems: ResolvedSystemConfig[] }
  | { type: 'SELECT_SYSTEM'; index: number }
  | { type: 'TASK_START' }
  | { type: 'TASK_COMPLETE' }
  | { type: 'TASK_ERROR'; error: string }
  | { type: 'UPDATE_PROGRESS'; progress: DownloadProgress }
  | { type: 'CLEAR_PROGRESS' }
  | { type: 'UPDATE_STATS'; stats: Partial<TaskStats> }
  | { type: 'RESET_STATS' }
  | { type: 'ADD_LOG'; entry: LogEntry }
  | { type: 'CLEAR_LOG' }
  | { type: 'SET_DRY_RUN'; enabled: boolean }
  | { type: 'CLEAR_ERROR' };

/** Initial state factory */
export function createInitialState(): AppState {
  return {
    screen: 'home',
    config: null,
    systems: [],
    selectedSystemIndex: 0,
    taskStatus: 'idle',
    currentProgress: null,
    stats: {
      found: 0,
      filtered: 0,
      downloaded: 0,
      skipped: 0,
      failed: 0,
    },
    log: [],
    lastError: null,
    dryRun: false,
  };
}
