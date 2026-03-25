import { gql } from '@apollo/client';

export const DELETE_CUSTOMER_ALIAS_MAPPING = gql`
  mutation DeleteCustomerAliasMapping($id: Int!) {
    deleteCustomerAliasMapping(id: $id)
  }
`;

export const UPDATE_CUSTOMER_MASTER = gql`
  mutation UpdateCustomerMaster($canonicalCustomerId: Int!, $input: UpdateCustomerMasterInput!) {
    updateCustomerMaster(canonicalCustomerId: $canonicalCustomerId, input: $input) {
      canonicalCustomerId
      canonicalCustomerName
      cisCode
      countryOfOperation
      mgs
      countryOfIncorporation
      region
    }
  }
`;

export const PUSH_TO_POSTGRES = gql`
  mutation PushToPostgres {
    pushToPostgres {
      mappingsCreated
      mappingsUpdated
      mastersCreated
      mastersUpdated
      totalProcessed
      errors
    }
  }
`;
