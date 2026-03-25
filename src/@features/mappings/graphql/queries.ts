import { gql } from '@apollo/client';

export const GET_CUSTOMER_MASTERS_WITH_ALIASES = gql`
  query GetCustomerMastersWithAliases($page: Int!, $pageSize: Int!, $search: String) {
    customerMastersWithAliases(page: $page, pageSize: $pageSize, search: $search) {
      items {
        canonicalCustomerId
        canonicalCustomerName
        cisCode
        countryOfOperation
        mgs
        region
        aliasMappings {
          id
          originalCustomerName
          cleanedCustomerName
        }
      }
      totalCount
      pageNumber
      pageSize
      totalPages
    }
  }
`;
