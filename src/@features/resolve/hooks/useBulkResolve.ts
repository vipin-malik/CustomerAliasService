import { useCallback, useRef, useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { RESOLVE_ALIASES_BULK } from '../graphql';
import type { BulkResultRow, LoadedCustomer, ResolveResponse } from '../types';
import { useResolveSession, useResolveSessionField } from '../store';

const CHUNK_SIZE = 5000;

export const mapBulkResult = (r: Partial<ResolveResponse>, id: number, name: string): BulkResultRow => ({
  id,
  originalName: name,
  cleanedName: r.commonName || null,
  canonicalCustomerId: r.canonicalCustomerId || null,
  canonicalName: r.canonicalCustomerName || null,
  mgs: r.mgs || null,
  cisCode: r.cisCode || null,
  ctryOfOp: r.country || null,
  region: r.region || null,
  isResolved: r.isResolved ?? false,
  confidenceScore: r.confidenceScore ?? null,
  matchedAlias: r.matchedAlias || null,
});

export const useBulkResolve = () => {
  const { bulkResults, bulkProgress } = useResolveSession();
  const setField = useResolveSessionField();

  const setBulkResults = useCallback(
    (v: BulkResultRow[] | ((prev: BulkResultRow[]) => BulkResultRow[])) => setField('bulkResults', v),
    [setField],
  );
  const setBulkProgress = useCallback(
    (v: { current: number; total: number; phase: string }) => setField('bulkProgress', v),
    [setField],
  );

  const [bulkLoading, setBulkLoading] = useState(false);
  const cancelledRef = useRef(false);

  const [resolveBulk] = useLazyQuery(RESOLVE_ALIASES_BULK);

  const handleBulkResolve = useCallback(
    async (selectedCustomers: LoadedCustomer[]) => {
      if (selectedCustomers.length === 0) return;

      cancelledRef.current = false;
      setBulkLoading(true);
      setBulkResults([]);

      const names = selectedCustomers.map((c) => c.name);
      const total = names.length;
      const totalChunks = Math.ceil(total / CHUNK_SIZE);

      setBulkProgress({ current: 0, total, phase: `Resolving ${total.toLocaleString()} names...` });

      const allResults: BulkResultRow[] = [];
      let globalId = 0;

      for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
        if (cancelledRef.current) break;

        const start = chunkIdx * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, total);
        const chunkNames = names.slice(start, end);

        const phase =
          totalChunks > 1
            ? `Chunk ${chunkIdx + 1}/${totalChunks} (${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()})`
            : `Resolving ${total.toLocaleString()} names...`;

        setBulkProgress({ current: start, total, phase });

        try {
          const { data } = await resolveBulk({
            variables: { aliases: chunkNames.map((n) => ({ aliasName: n })) },
          });

          const chunkData: ResolveResponse[] = data?.resolveAliasesBulk || [];
          for (let i = 0; i < chunkNames.length; i++) {
            globalId++;
            allResults.push(
              mapBulkResult(chunkData[i] || { isResolved: false }, globalId, chunkNames[i]),
            );
          }
        } catch {
          for (let i = 0; i < chunkNames.length; i++) {
            globalId++;
            allResults.push(mapBulkResult({ isResolved: false }, globalId, chunkNames[i]));
          }
        }

        setBulkResults([...allResults]);
        setBulkProgress({ current: end, total, phase: end >= total ? 'Complete' : phase });
      }

      setBulkLoading(false);
    },
    [resolveBulk, setBulkResults, setBulkProgress],
  );

  const cancelBulkResolve = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  return { bulkResults, setBulkResults, bulkProgress, bulkLoading, handleBulkResolve, cancelBulkResolve };
};
