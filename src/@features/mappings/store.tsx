import { createPersistedContext } from '@core/store';

export interface MappingsSessionState {
  page: number;
  pageSize: number;
  search: string;
  selectedMasterId: number | null;
}

const initialState: MappingsSessionState = {
  page: 0,
  pageSize: 25,
  search: '',
  selectedMasterId: null,
};

const store = createPersistedContext<MappingsSessionState>(
  'mappings-session',
  initialState,
  ['page', 'pageSize', 'search', 'selectedMasterId'],
);

export const MappingsSessionProvider = store.Provider;
export const useMappingsSession = store.useValue;
export const useMappingsSessionSetter = store.useSetter;
export const useMappingsSessionField = store.useSetField;
