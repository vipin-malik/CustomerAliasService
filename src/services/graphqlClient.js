import { ApolloClient, InMemoryCache, gql } from '@apollo/client';
import appConfig from '../config/appConfig';

export const apolloClient = new ApolloClient({
  uri: appConfig.graphql.uri,
  cache: new InMemoryCache(),
  defaultOptions: {
    query: { fetchPolicy: 'network-only' },
    mutate: { fetchPolicy: 'no-cache' },
  },
});

// GraphQL queries for alias resolution
// Update these queries to match your GraphQL API schema

export const RESOLVE_INVESTOR_ALIAS = gql`
  query ResolveInvestorAlias($aliasName: String!, $assetClass: String!) {
    resolveInvestorAlias(aliasName: $aliasName, assetClass: $assetClass) {
      commonName
      isResolved
      confidenceScore
      matchedAlias
      potentialMatches {
        commonName
        matchedAlias
        confidenceScore
      }
    }
  }
`;

export const RESOLVE_INVESTOR_ALIASES_BULK = gql`
  query ResolveInvestorAliasesBulk($aliases: [AliasInput!]!) {
    resolveInvestorAliasesBulk(aliases: $aliases) {
      aliasName
      commonName
      isResolved
      confidenceScore
      matchedAlias
      potentialMatches {
        commonName
        matchedAlias
        confidenceScore
      }
    }
  }
`;

export const GET_INVESTOR_MAPPINGS = gql`
  query GetInvestorMappings($page: Int, $pageSize: Int, $search: String, $assetClass: String) {
    investorMappings(page: $page, pageSize: $pageSize, search: $search, assetClass: $assetClass) {
      items {
        id
        assetClass
        commonName
        aliases
        createdAt
        updatedAt
      }
      totalCount
      pageNumber
      pageSize
      totalPages
    }
  }
`;

// Helper to resolve via GraphQL (falls back to REST if GraphQL is unavailable)
export async function resolveViaGraphQL(aliasName, assetClass) {
  try {
    const { data } = await apolloClient.query({
      query: RESOLVE_INVESTOR_ALIAS,
      variables: { aliasName, assetClass },
    });
    return data.resolveInvestorAlias;
  } catch {
    // GraphQL unavailable — caller should fall back to REST
    return null;
  }
}

export async function resolveBulkViaGraphQL(aliases) {
  try {
    const { data } = await apolloClient.query({
      query: RESOLVE_INVESTOR_ALIASES_BULK,
      variables: { aliases },
    });
    return data.resolveInvestorAliasesBulk;
  } catch {
    return null;
  }
}
