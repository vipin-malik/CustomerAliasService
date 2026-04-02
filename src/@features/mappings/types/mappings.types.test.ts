import type {
  AliasMapping,
  CustomerMasterWithAliases,
  MappingFormState,
  EditMasterFormState,
} from '@features/mappings/types/mappings.types';

describe('mappings type definitions', () => {
  describe('AliasMapping', () => {
    it('can create a valid AliasMapping object', () => {
      const mapping: AliasMapping = {
        id: 1,
        originalCustomerName: 'Test Corp',
        cleanedCustomerName: 'test corp',
      };

      expect(mapping.id).toBe(1);
      expect(mapping.originalCustomerName).toBe('Test Corp');
      expect(mapping.cleanedCustomerName).toBe('test corp');
    });
  });

  describe('CustomerMasterWithAliases', () => {
    it('can create a valid CustomerMasterWithAliases with aliases', () => {
      const master: CustomerMasterWithAliases = {
        canonicalCustomerId: 100,
        canonicalCustomerName: 'Master Corp',
        cisCode: 'CIS100',
        countryOfOperation: 'UK',
        mgs: 'Mid Cap',
        region: 'Europe',
        aliasMappings: [
          { id: 1, originalCustomerName: 'Alias 1', cleanedCustomerName: 'alias 1' },
          { id: 2, originalCustomerName: 'Alias 2', cleanedCustomerName: 'alias 2' },
        ],
      };

      expect(master.canonicalCustomerId).toBe(100);
      expect(master.aliasMappings).toHaveLength(2);
    });

    it('can have null optional fields', () => {
      const master: CustomerMasterWithAliases = {
        canonicalCustomerId: 200,
        canonicalCustomerName: 'Minimal Corp',
        cisCode: null,
        countryOfOperation: null,
        mgs: null,
        region: null,
        aliasMappings: [],
      };

      expect(master.cisCode).toBeNull();
      expect(master.countryOfOperation).toBeNull();
      expect(master.mgs).toBeNull();
      expect(master.region).toBeNull();
      expect(master.aliasMappings).toHaveLength(0);
    });
  });

  describe('MappingFormState', () => {
    it('can create a valid MappingFormState with all string fields', () => {
      const form: MappingFormState = {
        originalCustomerName: 'Original',
        cleanedCustomerName: 'cleaned',
        canonicalCustomerId: '42',
        canonicalCustomerName: 'Canonical',
        cisCode: 'CIS001',
        mgs: 'Large Cap',
        countryOfOperation: 'US',
        region: 'Americas',
      };

      expect(form.originalCustomerName).toBe('Original');
      expect(form.canonicalCustomerId).toBe('42');
    });

    it('can have empty string values for form fields', () => {
      const form: MappingFormState = {
        originalCustomerName: '',
        cleanedCustomerName: '',
        canonicalCustomerId: '',
        canonicalCustomerName: '',
        cisCode: '',
        mgs: '',
        countryOfOperation: '',
        region: '',
      };

      expect(form.originalCustomerName).toBe('');
      expect(form.canonicalCustomerId).toBe('');
    });
  });

  describe('EditMasterFormState', () => {
    it('can create a valid EditMasterFormState', () => {
      const form: EditMasterFormState = {
        canonicalCustomerId: 1,
        canonicalCustomerName: 'Edited Master',
        cisCode: 'CIS999',
        mgs: 'Small Cap',
        countryOfOperation: 'JP',
        region: 'Asia',
      };

      expect(form.canonicalCustomerId).toBe(1);
      expect(form.canonicalCustomerName).toBe('Edited Master');
    });

    it('can have null canonicalCustomerId for new entries', () => {
      const form: EditMasterFormState = {
        canonicalCustomerId: null,
        canonicalCustomerName: 'New Master',
        cisCode: '',
        mgs: '',
        countryOfOperation: '',
        region: '',
      };

      expect(form.canonicalCustomerId).toBeNull();
    });
  });
});
