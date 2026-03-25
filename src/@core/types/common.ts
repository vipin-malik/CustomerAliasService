export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface PushToDbResponse {
  mappingsCreated: number;
  mappingsUpdated: number;
  mastersCreated: number;
  mastersUpdated: number;
  totalProcessed: number;
  errors: string[];
}

export interface CustomerMaster {
  canonicalCustomerId: number;
  canonicalCustomerName: string;
  cisCode: string | null;
  countryOfOperation: string | null;
  countryOfIncorporation?: string | null;
  mgs: string | null;
  region: string | null;
  aliasMappings?: CustomerAliasMapping[];
}

export interface CustomerAliasMapping {
  id: number;
  originalCustomerName: string;
  cleanedCustomerName: string;
  canonicalCustomerId: number;
  customerMaster?: CustomerMaster | null;
}

export interface NavigationItem {
  name: string;
  path: string;
}

export interface InvestorDto {
  id: number;
  name: string;
  cisCode: string | null;
  tranche: string | null;
  source: string | null;
  seniority: string | null;
  currency: string | null;
  country: string | null;
  industry: string | null;
}
