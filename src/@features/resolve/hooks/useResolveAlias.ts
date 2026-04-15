import { useCallback } from 'react';
import { useLazyQuery } from '@apollo/client';
import { RESOLVE_ALIAS } from '../graphql';
import type { ResolveResponse } from '../types';
import { useResolveSession, useResolveSessionField } from '../store';

export const useResolveAlias = () => {
  const { singleResult } = useResolveSession();
  const setField = useResolveSessionField();

  const setSingleResult = useCallback(
    (r: ResolveResponse | null) => setField('singleResult', r),
    [setField],
  );

  const [resolveOne, { loading: singleLoading }] = useLazyQuery(RESOLVE_ALIAS, {
    onCompleted: (data) => setSingleResult(data.resolveAlias),
    onError: (err) => setSingleResult({ isResolved: false, error: err.message } as ResolveResponse),
  });

  return { resolveOne, singleResult, singleLoading, setSingleResult };
};
