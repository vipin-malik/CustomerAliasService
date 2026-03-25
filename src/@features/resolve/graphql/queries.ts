import { gql } from '@apollo/client';

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
