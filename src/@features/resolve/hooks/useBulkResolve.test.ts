import { mapBulkResult } from '@features/resolve/hooks/useBulkResolve';
import type { BulkResultRow, ResolveResponse } from '@features/resolve/types';

describe('mapBulkResult', () => {
  it('maps a fully resolved response to a BulkResultRow', () => {
    const response: Partial<ResolveResponse> = {
      commonName: 'Acme Corp',
      canonicalCustomerId: 42,
      canonicalCustomerName: 'ACME Corporation',
      mgs: 'Large Cap',
      cisCode: 'CIS001',
      country: 'US',
      region: 'North America',
      isResolved: true,
      confidenceScore: 95,
      matchedAlias: 'Acme',
    };

    const result = mapBulkResult(response, 1, 'acme corp');

    expect(result).toEqual<BulkResultRow>({
      id: 1,
      originalName: 'acme corp',
      cleanedName: 'Acme Corp',
      canonicalCustomerId: 42,
      canonicalName: 'ACME Corporation',
      mgs: 'Large Cap',
      cisCode: 'CIS001',
      ctryOfOp: 'US',
      region: 'North America',
      isResolved: true,
      confidenceScore: 95,
      matchedAlias: 'Acme',
    });
  });

  it('maps an unresolved response with null fields', () => {
    const response: Partial<ResolveResponse> = {
      isResolved: false,
    };

    const result = mapBulkResult(response, 5, 'Unknown Company');

    expect(result.id).toBe(5);
    expect(result.originalName).toBe('Unknown Company');
    expect(result.isResolved).toBe(false);
    expect(result.cleanedName).toBeNull();
    expect(result.canonicalCustomerId).toBeNull();
    expect(result.canonicalName).toBeNull();
    expect(result.mgs).toBeNull();
    expect(result.cisCode).toBeNull();
    expect(result.ctryOfOp).toBeNull();
    expect(result.region).toBeNull();
    expect(result.confidenceScore).toBeNull();
    expect(result.matchedAlias).toBeNull();
  });

  it('maps an empty response object defaulting isResolved to false', () => {
    const result = mapBulkResult({}, 10, 'Test Name');

    expect(result.isResolved).toBe(false);
    expect(result.confidenceScore).toBeNull();
  });

  it('preserves the original name exactly as provided', () => {
    const result = mapBulkResult({ isResolved: true }, 1, '  Spaced Name  ');

    expect(result.originalName).toBe('  Spaced Name  ');
  });

  it('returns correct BulkResultRow shape', () => {
    const result = mapBulkResult({}, 1, 'test');

    const expectedKeys: (keyof BulkResultRow)[] = [
      'id',
      'originalName',
      'cleanedName',
      'canonicalCustomerId',
      'canonicalName',
      'mgs',
      'cisCode',
      'ctryOfOp',
      'region',
      'isResolved',
      'confidenceScore',
      'matchedAlias',
    ];

    expectedKeys.forEach((key) => {
      expect(result).toHaveProperty(key);
    });
  });
});
