import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';

/**
 * Factory producing a feature-scoped session store backed by two contexts:
 *  - a value context (subscribers re-render on change)
 *  - a setter context (pure dispatchers; never re-render)
 *
 * State is hydrated from sessionStorage on first mount and written back
 * (debounced via rAF) on every change. Quota errors are swallowed so large
 * ephemeral values (e.g. bulk result arrays) degrade gracefully to in-memory.
 */
import { isFullReload } from './reloadDetector';

export function createPersistedContext<T extends object>(
  storageKey: string,
  initialState: T,
  persistKeys?: (keyof T)[],
) {
  const ValueContext = createContext<T | null>(null);
  const SetterContext = createContext<Dispatch<SetStateAction<T>> | null>(null);

  const hydrate = (): T => {
    if (typeof window === 'undefined') return initialState;
    try {
      // Full page reload: user was warned by beforeunload; honor their choice by discarding state.
      if (isFullReload()) {
        window.sessionStorage.removeItem(storageKey);
        return initialState;
      }
      const raw = window.sessionStorage.getItem(storageKey);
      if (!raw) return initialState;
      const parsed = JSON.parse(raw) as Partial<T>;
      return { ...initialState, ...parsed };
    } catch {
      return initialState;
    }
  };

  const pickPersistable = (state: T): Partial<T> => {
    if (!persistKeys) return state;
    const out: Partial<T> = {};
    for (const k of persistKeys) out[k] = state[k];
    return out;
  };

  const Provider = ({ children }: { children: ReactNode }) => {
    const [state, setState] = useState<T>(hydrate);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        try {
          window.sessionStorage.setItem(storageKey, JSON.stringify(pickPersistable(state)));
        } catch {
          // quota exceeded or serialization failed — fall back to in-memory only
        }
      });
      return () => {
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      };
    }, [state]);


    return (
      <SetterContext.Provider value={setState}>
        <ValueContext.Provider value={state}>{children}</ValueContext.Provider>
      </SetterContext.Provider>
    );
  };

  const useValue = (): T => {
    const ctx = useContext(ValueContext);
    if (!ctx) throw new Error(`${storageKey} provider missing`);
    return ctx;
  };

  const useSetter = (): Dispatch<SetStateAction<T>> => {
    const ctx = useContext(SetterContext);
    if (!ctx) throw new Error(`${storageKey} provider missing`);
    return ctx;
  };

  /** Returns a stable setter for a single field — components using this never re-render on state changes. */
  const useSetField = <K extends keyof T>(): ((key: K, value: T[K] | ((prev: T[K]) => T[K])) => void) => {
    const setState = useSetter();
    return useCallback(
      (key, value) =>
        setState((prev) => {
          const next = typeof value === 'function' ? (value as (p: T[K]) => T[K])(prev[key]) : value;
          return Object.is(prev[key], next) ? prev : { ...prev, [key]: next };
        }),
      [setState],
    );
  };

  return { Provider, useValue, useSetter, useSetField };
}
