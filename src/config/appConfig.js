const appConfig = {
  appName: 'Customer Alias Manager',
  shortName: 'CAM',

  // REST API
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1/investor',
  },

  // GraphQL API for alias resolution
  graphql: {
    uri: import.meta.env.VITE_GRAPHQL_URI || '/graphql',
  },

  // Postgres customer data API
  customerApi: {
    baseUrl: import.meta.env.VITE_CUSTOMER_API_BASE_URL || '/api/v1/investors',
  },

  // Default pagination
  defaultPageSize: 25,
  maxPageSize: 100,

  // Asset class options
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

  // Navigation
  navigation: [
    { name: 'Dashboard', path: '/' },
    { name: 'Customers', path: '/customers' },
    { name: 'Resolve', path: '/resolve' },
    { name: 'Mappings', path: '/mappings' },
  ],
};

export default appConfig;
