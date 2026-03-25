import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_CUSTOMER_MASTERS_WITH_ALIASES } from '../graphql';
import type { CustomerMasterWithAliases } from '../types';

export const useMappings = () => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');

  const { data, loading, refetch } = useQuery(GET_CUSTOMER_MASTERS_WITH_ALIASES, {
    variables: { page: page + 1, pageSize, search: search || null },
  });

  const masters: CustomerMasterWithAliases[] = data?.customerMastersWithAliases?.items || [];
  const totalCount: number = data?.customerMastersWithAliases?.totalCount || 0;

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
