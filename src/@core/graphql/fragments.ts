import { gql } from '@apollo/client';

export const CREATE_CUSTOMER_ALIAS_MAPPING = gql`
  mutation CreateCustomerAliasMapping($input: CreateMappingInput!) {
    createCustomerAliasMapping(input: $input) {
      id
      originalCustomerName
      cleanedCustomerName
      canonicalCustomerId
      customerMaster {
        canonicalCustomerName
        cisCode
        countryOfOperation
        mgs
        region
      }
    }
  }
`;
