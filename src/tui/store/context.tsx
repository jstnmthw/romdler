/**
 * Application state context and reducer
 * Manages global state for the TUI using React Context + useReducer
 */

import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
} from 'react';
import {
  type AppState,
  type AppAction,
  type TaskStats,
  createInitialState,
} from './types.js';

/** Initial stats object */
const INITIAL_STATS: TaskStats = {
  found: 0,
  filtered: 0,
  downloaded: 0,
  skipped: 0,
  failed: 0,
};

/** Handle navigation action */
function handleNavigate(state: AppState, action: Extract<AppAction, { type: 'NAVIGATE' }>): AppState {
  return { ...state, screen: action.screen };
}

/** Handle config set action */
function handleSetConfig(state: AppState, action: Extract<AppAction, { type: 'SET_CONFIG' }>): AppState {
  return {
    ...state,
    config: action.config,
    systems: action.systems,
    selectedSystemIndex: 0,
  };
}

/** Handle task state actions */
function handleTaskAction(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'TASK_START':
      return { ...state, taskStatus: 'running', lastError: null, stats: { ...INITIAL_STATS } };
    case 'TASK_COMPLETE':
      return { ...state, taskStatus: 'complete', currentProgress: null };
    case 'TASK_ERROR':
      return { ...state, taskStatus: 'error', lastError: action.error, currentProgress: null };
    default:
      return state;
  }
}

/** Handle log actions */
function handleLogAction(state: AppState, action: AppAction): AppState {
  if (action.type === 'ADD_LOG') {
    const newLog = [...state.log, action.entry].slice(-100);
    return { ...state, log: newLog };
  }
  if (action.type === 'CLEAR_LOG') {
    return { ...state, log: [] };
  }
  return state;
}

/**
 * State reducer - handles all state transitions
 */
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'NAVIGATE':
      return handleNavigate(state, action);

    case 'SET_CONFIG':
      return handleSetConfig(state, action);

    case 'SELECT_SYSTEM':
      return { ...state, selectedSystemIndex: action.index };

    case 'TASK_START':
    case 'TASK_COMPLETE':
    case 'TASK_ERROR':
      return handleTaskAction(state, action);

    case 'UPDATE_PROGRESS':
      return { ...state, currentProgress: action.progress };

    case 'CLEAR_PROGRESS':
      return { ...state, currentProgress: null };

    case 'UPDATE_STATS':
      return { ...state, stats: { ...state.stats, ...action.stats } };

    case 'RESET_STATS':
      return { ...state, stats: { ...INITIAL_STATS } };

    case 'ADD_LOG':
    case 'CLEAR_LOG':
      return handleLogAction(state, action);

    case 'SET_DRY_RUN':
      return { ...state, dryRun: action.enabled };

    case 'CLEAR_ERROR':
      return { ...state, lastError: null };

    default:
      return state;
  }
}

/** Context value type */
type AppContextValue = {
  state: AppState;
  dispatch: Dispatch<AppAction>;
};

const AppContext = createContext<AppContextValue | null>(null);

type AppProviderProps = {
  children: ReactNode;
  initialState?: Partial<AppState>;
};

/**
 * Provider component for application state
 * Wraps the app and provides state + dispatch to all children
 */
export function AppProvider({
  children,
  initialState,
}: AppProviderProps): React.JSX.Element {
  const [state, dispatch] = useReducer(appReducer, {
    ...createInitialState(),
    ...initialState,
  });

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Hook to access application state
 * @returns The current state object
 * @throws Error if used outside AppProvider
 */
export function useAppState(): AppState {
  const context = useContext(AppContext);
  if (context === null) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return context.state;
}

/**
 * Hook to access dispatch function
 * @returns The dispatch function
 * @throws Error if used outside AppProvider
 */
export function useAppDispatch(): Dispatch<AppAction> {
  const context = useContext(AppContext);
  if (context === null) {
    throw new Error('useAppDispatch must be used within AppProvider');
  }
  return context.dispatch;
}

/**
 * Hook to access both state and dispatch
 * @returns Tuple of [state, dispatch]
 * @throws Error if used outside AppProvider
 */
export function useApp(): [AppState, Dispatch<AppAction>] {
  const context = useContext(AppContext);
  if (context === null) {
    throw new Error('useApp must be used within AppProvider');
  }
  return [context.state, context.dispatch];
}
