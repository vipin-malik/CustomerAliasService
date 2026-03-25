import { useState, useEffect, useCallback } from 'react';
import { useMutation, useLazyQuery } from '@apollo/client';
import { CREATE_CUSTOMER_ALIAS_MAPPING, RESOLVE_ALIAS, GET_CUSTOMER_MASTERS } from '../graphql';
import { useNotification } from '@core/context';
import type {
  EditFormState,
  BulkResultRow,
  ResolveResponse,
  CustomerMasterOption,
} from '../types';

const EMPTY_FORM: EditFormState = {
  originalCustomerName: '',
  cleanedCustomerName: '',
  canonicalCustomerId: '',
  canonicalCustomerName: '',
  cisCode: '',
  mgs: '',
  countryOfOperation: '',
  region: '',
};

interface UseEditMappingOptions {
  onSingleReResolved: (resolved: ResolveResponse) => void;
  onBulkRowReResolved: (rowId: number, resolved: ResolveResponse) => void;
}

export const useEditMapping = ({ onSingleReResolved, onBulkRowReResolved }: UseEditMappingOptions) => {
  const { showSuccess, showError } = useNotification();

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>(EMPTY_FORM);
  const [editRow, setEditRow] = useState<BulkResultRow | null>(null);
  const [editSource, setEditSource] = useState<'single' | 'bulk'>('single');
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [masterOptions, setMasterOptions] = useState<CustomerMasterOption[]>([]);

  const [createMapping, { loading: editSaving }] = useMutation(CREATE_CUSTOMER_ALIAS_MAPPING);
  const [resolveOne] = useLazyQuery(RESOLVE_ALIAS);
  const [fetchMasters, { loading: masterLoading }] = useLazyQuery(GET_CUSTOMER_MASTERS, {
    onCompleted: (data) => setMasterOptions(data.customerMasters?.items || []),
    onError: () => setMasterOptions([]),
  });

  useEffect(() => {
    fetchMasters({ variables: { page: 1, pageSize: 50, search: null } });
  }, [fetchMasters]);

  const loadMasters = useCallback(
    (search: string) => {
      fetchMasters({ variables: { page: 1, pageSize: 50, search: search || null } });
    },
    [fetchMasters],
  );

  const openEditDialog = (
    originalName: string,
    cleanedName: string | null,
    canonicalId: number | null,
    source: 'single' | 'bulk',
    row: BulkResultRow | null,
    extra: {
      canonicalCustomerName?: string;
      cisCode?: string;
      mgs?: string;
      countryOfOperation?: string;
      region?: string;
    } = {},
  ) => {
    setEditForm({
      originalCustomerName: originalName || '',
      cleanedCustomerName: cleanedName || '',
      canonicalCustomerId: canonicalId?.toString() || '',
      canonicalCustomerName: extra.canonicalCustomerName || '',
      cisCode: extra.cisCode || '',
      mgs: extra.mgs || '',
      countryOfOperation: extra.countryOfOperation || '',
      region: extra.region || '',
    });
    setEditSource(source);
    setEditRow(row);
    setEditOpen(true);
  };

  const handleSaveMapping = async () => {
    if (!editForm.originalCustomerName.trim()) return;
    try {
      await createMapping({
        variables: {
          input: {
            originalCustomerName: editForm.originalCustomerName.trim(),
            cleanedCustomerName: editForm.cleanedCustomerName.trim() || null,
            canonicalCustomerId: editForm.canonicalCustomerId
              ? parseInt(editForm.canonicalCustomerId, 10)
              : null,
            canonicalCustomerName: editForm.canonicalCustomerName.trim() || null,
            cisCode: editForm.cisCode.trim() || null,
            mgs: editForm.mgs.trim() || null,
            countryOfOperation: editForm.countryOfOperation.trim() || null,
            region: editForm.region.trim() || null,
          },
        },
      });
      showSuccess('Mapping saved');
      setEditOpen(false);

      const { data } = await resolveOne({
        variables: { aliasName: editForm.originalCustomerName.trim(), assetClass: null },
      });
      const resolved = data?.resolveAlias as ResolveResponse | undefined;
      if (!resolved) return;

      if (editSource === 'single') {
        onSingleReResolved(resolved);
      } else if (editSource === 'bulk' && editRow) {
        onBulkRowReResolved(editRow.id, resolved);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      showError(message);
    }
  };

  return {
    editOpen,
    setEditOpen,
    editForm,
    setEditForm,
    editRow,
    editSource,
    confirmSaveOpen,
    setConfirmSaveOpen,
    masterOptions,
    masterLoading,
    editSaving,
    openEditDialog,
    handleSaveMapping,
    loadMasters,
  };
};
