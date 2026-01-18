/**
 * Task execution hook
 */

import { useCallback } from 'react';
import { useAppState, useAppDispatch, type TaskStatus, type TaskStats } from '../store/index.js';

type TaskHook = {
  /** Current task status */
  status: TaskStatus;
  /** Whether a task is running */
  isRunning: boolean;
  /** Task statistics */
  stats: TaskStats;
  /** Last error message */
  error: string | null;
  /** Start a task */
  start: () => void;
  /** Mark task as complete */
  complete: () => void;
  /** Mark task as failed */
  fail: (error: string) => void;
  /** Update statistics */
  updateStats: (stats: Partial<TaskStats>) => void;
  /** Reset task state */
  reset: () => void;
};

/**
 * Hook for task execution management
 * @returns Task state and control functions
 */
export function useTask(): TaskHook {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const start = useCallback(() => {
    dispatch({ type: 'TASK_START' });
  }, [dispatch]);

  const complete = useCallback(() => {
    dispatch({ type: 'TASK_COMPLETE' });
  }, [dispatch]);

  const fail = useCallback(
    (error: string) => {
      dispatch({ type: 'TASK_ERROR', error });
    },
    [dispatch]
  );

  const updateStats = useCallback(
    (stats: Partial<TaskStats>) => {
      dispatch({ type: 'UPDATE_STATS', stats });
    },
    [dispatch]
  );

  const reset = useCallback(() => {
    dispatch({ type: 'RESET_STATS' });
    dispatch({ type: 'CLEAR_ERROR' });
    dispatch({ type: 'CLEAR_PROGRESS' });
  }, [dispatch]);

  return {
    status: state.taskStatus,
    isRunning: state.taskStatus === 'running',
    stats: state.stats,
    error: state.lastError,
    start,
    complete,
    fail,
    updateStats,
    reset,
  };
}
