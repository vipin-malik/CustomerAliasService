import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import appConfig from '@core/config/appConfig';

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
