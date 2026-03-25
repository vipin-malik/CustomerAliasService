import { useMutation } from '@apollo/client';
import { useNotification } from '@core/context';
import {
  CREATE_CUSTOMER_ALIAS_MAPPING,
  DELETE_CUSTOMER_ALIAS_MAPPING,
  UPDATE_CUSTOMER_MASTER,
  PUSH_TO_POSTGRES,
} from '../graphql';
import type { MappingFormState, EditMasterFormState } from '../types';

interface UseMappingMutationsOptions {
  refetch: () => void;
  onCreateCompleted?: () => void;
  onDeleteCompleted?: () => void;
  onUpdateCompleted?: () => void;
}

export const useMappingMutations = ({
  refetch,
  onCreateCompleted,
  onDeleteCompleted,
  onUpdateCompleted,
}: UseMappingMutationsOptions) => {
  const { showSuccess, showError } = useNotification();

  const [createMappingMutation, { loading: creating }] = useMutation(CREATE_CUSTOMER_ALIAS_MAPPING, {
    onCompleted: () => {
      showSuccess('Mapping created');
      onCreateCompleted?.();
      refetch();
    },
    onError: () => showError('Failed to create'),
  });

  const [deleteMappingMutation, { loading: deleting }] = useMutation(DELETE_CUSTOMER_ALIAS_MAPPING, {
    onCompleted: () => {
      showSuccess('Alias mapping deleted');
      onDeleteCompleted?.();
      refetch();
    },
    onError: () => showError('Failed to delete'),
  });

  const [updateMasterMutation, { loading: updating }] = useMutation(UPDATE_CUSTOMER_MASTER, {
    onCompleted: () => {
      showSuccess('Customer updated');
      onUpdateCompleted?.();
      refetch();
    },
    onError: () => showError('Failed to update'),
  });

  const [pushToPostgresMutation, { loading: pushingPg }] = useMutation(PUSH_TO_POSTGRES, {
    onCompleted: ({ pushToPostgres: d }) => {
      showSuccess(
        `Pushed to Postgres: ${d.mastersCreated} masters created, ${d.mastersUpdated} updated, ${d.mappingsCreated} mappings created, ${d.mappingsUpdated} updated`,
      );
      if (d.errors?.length > 0) {
        d.errors.forEach((e: string) => showError(e));
      }
    },
    onError: (err) => showError(err.message || 'Push to Postgres failed'),
  });

  const createMapping = (form: MappingFormState) => {
    createMappingMutation({
      variables: {
        input: {
          originalCustomerName: form.originalCustomerName,
          cleanedCustomerName: form.cleanedCustomerName || null,
          canonicalCustomerId: form.canonicalCustomerId ? parseInt(form.canonicalCustomerId) : null,
          canonicalCustomerName: form.canonicalCustomerName || null,
          cisCode: form.cisCode || null,
          mgs: form.mgs || null,
          countryOfOperation: form.countryOfOperation || null,
          region: form.region || null,
        },
      },
    });
  };

  const deleteMapping = (id: number) => {
    deleteMappingMutation({ variables: { id } });
  };

  const updateMaster = (editForm: EditMasterFormState) => {
    updateMasterMutation({
      variables: {
        canonicalCustomerId: editForm.canonicalCustomerId,
        input: {
          canonicalCustomerName: editForm.canonicalCustomerName || null,
          cisCode: editForm.cisCode || null,
          mgs: editForm.mgs || null,
          countryOfOperation: editForm.countryOfOperation || null,
          region: editForm.region || null,
        },
      },
    });
  };

  const pushToPostgres = () => {
    pushToPostgresMutation();
  };

  return {
    createMapping,
    deleteMapping,
    updateMaster,
    pushToPostgres,
    creating,
    deleting,
    updating,
    pushingPg,
  };
};
