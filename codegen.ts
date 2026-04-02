import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  // Point to the running HotChocolate GraphQL server
  schema: 'http://localhost:5001/graphql',

  // Scan all .ts files containing gql`` tagged templates
  documents: ['src/**/*.{ts,tsx}'],

  // Generate types into @api (which aliases to @core/graphql)
  generates: {
    'src/@core/graphql/generated/types.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typed-document-node',
      ],
      config: {
        // Use the same naming convention as our manual types
        skipTypename: false,
        enumsAsTypes: true,
        // Avoid conflicts with our manually defined types
        // by using a Gql prefix
        typesPrefix: 'Gql',
      },
    },
  },

  // Ignore errors for offline development
  ignoreNoDocuments: true,
};

export default config;
