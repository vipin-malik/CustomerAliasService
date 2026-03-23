import { ApolloClient, InMemoryCache, HttpLink, gql } from '@apollo/client';
import appConfig from '../config/appConfig';

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: appConfig.graphql.uri }),
  cache: new InMemoryCache({
    typePolicies: {
      CustomerMaster: { keyFields: false },
      CustomerAliasMapping: { keyFields: false },
      InvestorDto: { keyFields: false },
      ResolveResponse: { keyFields: false },
      PotentialMatch: { keyFields: false },
      PagedResultOfCustomerMaster: { keyFields: false },
      PagedResultOfCustomerAliasMapping: { keyFields: false },
      PagedResultOfInvestorDto: { keyFields: false },
      PushToDbResponse: { keyFields: false },
      HealthResult: { keyFields: false },
    },
  }),
  defaultOptions: {
    query: { fetchPolicy: 'network-only' },
    mutate: { fetchPolicy: 'no-cache' },
  },
});

// ═══════════════════════════════════════════════════════════════
// Queries
// ═══════════════════════════════════════════════════════════════

export const GET_INVESTORS = gql`
  query GetInvestors($page: Int!, $pageSize: Int!, $search: String) {
    investors(page: $page, pageSize: $pageSize, search: $search) {
      items {
        id
        name
        cisCode
        tranche
        source
        seniority
        currency
        country
        industry
      }
      totalCount
      pageNumber
      pageSize
      totalPages
    }
  }
`;

export const GET_CUSTOMER_ALIAS_MAPPINGS = gql`
  query GetCustomerAliasMappings($page: Int!, $pageSize: Int!, $search: String) {
    customerAliasMappings(page: $page, pageSize: $pageSize, search: $search) {
      items {
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
      totalCount
      pageNumber
      pageSize
      totalPages
    }
  }
`;

export const GET_CUSTOMER_MASTERS = gql`
  query GetCustomerMasters($page: Int!, $pageSize: Int!, $search: String) {
    customerMasters(page: $page, pageSize: $pageSize, search: $search) {
      items {
        canonicalCustomerId
        canonicalCustomerName
        cisCode
        countryOfOperation
        mgs
        region
      }
      totalCount
      pageNumber
      pageSize
      totalPages
    }
  }
`;

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

export const RESOLVE_ALIAS = gql`
  query ResolveAlias($aliasName: String!, $assetClass: String) {
    resolveAlias(aliasName: $aliasName, assetClass: $assetClass) {
      customerName
      commonName
      isResolved
      confidenceScore
      matchedAlias
      canonicalCustomerId
      canonicalCustomerName
      cisCode
      country
      region
      mgs
      potentialMatches {
        commonName
        matchedAlias
        confidenceScore
      }
    }
  }
`;

export const RESOLVE_ALIASES_BULK = gql`
  query ResolveAliasesBulk($aliases: [AliasInput!]!) {
    resolveAliasesBulk(aliases: $aliases) {
      customerName
      commonName
      isResolved
      confidenceScore
      matchedAlias
      canonicalCustomerId
      canonicalCustomerName
      cisCode
      country
      region
      mgs
    }
  }
`;

// ═══════════════════════════════════════════════════════════════
// Mutations
// ═══════════════════════════════════════════════════════════════

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

export const DELETE_CUSTOMER_ALIAS_MAPPING = gql`
  mutation DeleteCustomerAliasMapping($id: Int!) {
    deleteCustomerAliasMapping(id: $id)
  }
`;

export const PUSH_TO_DB = gql`
  mutation PushToDb($records: [PushRecordInput!]!) {
    pushToDb(records: $records) {
      mappingsCreated
      mappingsUpdated
      mastersCreated
      mastersUpdated
      totalProcessed
      errors
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
