export interface AliasMapping {
  id: number;
  originalCustomerName: string;
  cleanedCustomerName: string;
}

export interface CustomerMasterWithAliases {
  canonicalCustomerId: number;
  canonicalCustomerName: string;
  cisCode: string | null;
  countryOfOperation: string | null;
  mgs: string | null;
  region: string | null;
  aliasMappings: AliasMapping[];
}

export interface MappingFormState {
  originalCustomerName: string;
  cleanedCustomerName: string;
  canonicalCustomerId: string;
  canonicalCustomerName: string;
  cisCode: string;
  mgs: string;
  countryOfOperation: string;
  region: string;
}

export interface EditMasterFormState {
  canonicalCustomerId: number | null;
  canonicalCustomerName: string;
  cisCode: string;
  mgs: string;
  countryOfOperation: string;
  region: string;
}
