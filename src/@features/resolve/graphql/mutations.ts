import { gql } from '@apollo/client';

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
