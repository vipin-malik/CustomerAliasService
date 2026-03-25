import { useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { RESOLVE_ALIAS } from '../graphql';
import type { ResolveResponse } from '../types';

export const useResolveAlias = () => {
  const [singleResult, setSingleResult] = useState<ResolveResponse | null>(null);

  const [resolveOne, { loading: singleLoading }] = useLazyQuery(RESOLVE_ALIAS, {
    onCompleted: (data) => setSingleResult(data.resolveAlias),
    onError: (err) => setSingleResult({ isResolved: false, error: err.message } as ResolveResponse),
  });

  return { resolveOne, singleResult, singleLoading, setSingleResult };
};
