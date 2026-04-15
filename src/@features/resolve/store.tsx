import { createPersistedContext } from '@core/store';
import type { BulkResultRow, LoadedCustomer, ResolveResponse } from './types';

export interface ResolveSessionState {
  singleName: string;
  singleResult: ResolveResponse | null;
  loadedCustomers: LoadedCustomer[];
  dbSearch: string;
  activeStep: number;
  showBulkInput: boolean;
  bulkText: string;
  bulkResults: BulkResultRow[];
  bulkProgress: { current: number; total: number; phase: string };
}

const initialState: ResolveSessionState = {
  singleName: '',
  singleResult: null,
  loadedCustomers: [],
  dbSearch: '',
  activeStep: 0,
  showBulkInput: false,
  bulkText: '',
  bulkResults: [],
  bulkProgress: { current: 0, total: 0, phase: '' },
};

const store = createPersistedContext<ResolveSessionState>(
  'resolve-session',
  initialState,
  // Persist everything browseable; bulkResults can be large but sessionStorage
  // write is guarded — falls back to in-memory only if quota is exceeded.
  [
    'singleName',
    'singleResult',
    'loadedCustomers',
    'dbSearch',
    'activeStep',
    'showBulkInput',
    'bulkText',
    'bulkResults',
  ],
);

export const ResolveSessionProvider = store.Provider;
export const useResolveSession = store.useValue;
export const useResolveSessionSetter = store.useSetter;
export const useResolveSessionField = store.useSetField;
