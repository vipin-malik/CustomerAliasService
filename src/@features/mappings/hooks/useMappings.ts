import { useCallback } from 'react';
import { useQuery } from '@apollo/client';
import { GET_CUSTOMER_MASTERS_WITH_ALIASES } from '../graphql';
import type { CustomerMasterWithAliases } from '../types';
import { useMappingsSession, useMappingsSessionField } from '../store';

export const useMappings = () => {
  const { page, pageSize, search } = useMappingsSession();
  const setField = useMappingsSessionField();

  const { data, loading, refetch } = useQuery(GET_CUSTOMER_MASTERS_WITH_ALIASES, {
    variables: { page: page + 1, pageSize, search: search || null },
  });

  const masters: CustomerMasterWithAliases[] = data?.customerMastersWithAliases?.items || [];
  const totalCount: number = data?.customerMastersWithAliases?.totalCount || 0;

  const setPage = useCallback((v: number) => setField('page', v), [setField]);
  const setPageSize = useCallback((v: number) => setField('pageSize', v), [setField]);
  const setSearch = useCallback((v: string) => setField('search', v), [setField]);

  return {
    masters,
    totalCount,
    loading,
    refetch,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
  };
};
