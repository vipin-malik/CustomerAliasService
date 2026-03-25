export interface PotentialMatch {
  commonName: string;
  matchedAlias: string;
  confidenceScore: number;
}

export interface ResolveResponse {
  customerName: string;
  commonName: string | null;
  isResolved: boolean;
  confidenceScore: number | null;
  matchedAlias: string | null;
  canonicalCustomerId: number | null;
  canonicalCustomerName: string | null;
  cisCode: string | null;
  country: string | null;
  region: string | null;
  mgs: string | null;
  potentialMatches: PotentialMatch[] | null;
  error?: string;
}

export interface BulkResultRow {
  id: number;
  originalName: string;
  cleanedName: string | null;
  canonicalCustomerId: number | null;
  canonicalName: string | null;
  mgs: string | null;
  cisCode: string | null;
  ctryOfOp: string | null;
  region: string | null;
  isResolved: boolean;
  confidenceScore: number | null;
  matchedAlias: string | null;
}

export interface EditFormState {
  originalCustomerName: string;
  cleanedCustomerName: string;
  canonicalCustomerId: string;
  canonicalCustomerName: string;
  cisCode: string;
  mgs: string;
  countryOfOperation: string;
  region: string;
}

export interface LoadedCustomer {
  id: number;
  name: string;
  cisCode: string;
  tranche: string;
  loanType: string;
  seniority: string;
  currency: string;
  country: string;
  industry: string;
}

export interface AliasInput {
  aliasName: string;
}

export interface CustomerMasterOption {
  canonicalCustomerId: number;
  canonicalCustomerName: string;
  cisCode: string | null;
  countryOfOperation: string | null;
  mgs: string | null;
  region: string | null;
  isNew?: boolean;
}
