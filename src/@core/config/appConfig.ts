import type { NavigationItem } from '@core/types';

interface GraphqlConfig {
  uri: string;
}

interface AppConfig {
  appName: string;
  shortName: string;
  graphql: GraphqlConfig;
  defaultPageSize: number;
  maxPageSize: number;
  assetClasses: string[];
  navigation: NavigationItem[];
}

const appConfig: AppConfig = {
  appName: 'Customer Alias Manager',
  shortName: 'CAM',

  graphql: {
    uri: import.meta.env.VITE_GRAPHQL_URI || '/graphql',
  },

  defaultPageSize: 25,
  maxPageSize: 100,

  assetClasses: [
    'Equity',
    'Fixed Income',
    'Real Estate',
    'Private Equity',
    'Hedge Fund',
    'Infrastructure',
    'Commodities',
    'Multi-Asset',
    'Other',
  ],

  navigation: [
    { name: 'Resolve', path: '/' },
    { name: 'Mappings', path: '/mappings' },
  ],
};

export default appConfig;
