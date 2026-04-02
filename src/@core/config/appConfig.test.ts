import appConfig from '@core/config/appConfig';

describe('appConfig', () => {
  describe('required properties', () => {
    it('has an appName', () => {
      expect(appConfig.appName).toBeDefined();
      expect(typeof appConfig.appName).toBe('string');
    });

    it('has a graphql.uri', () => {
      expect(appConfig.graphql).toBeDefined();
      expect(appConfig.graphql.uri).toBeDefined();
      expect(typeof appConfig.graphql.uri).toBe('string');
    });

    it('has a navigation array', () => {
      expect(appConfig.navigation).toBeDefined();
      expect(Array.isArray(appConfig.navigation)).toBe(true);
    });
  });

  describe('default values', () => {
    it('has appName set to "Customer Alias Manager"', () => {
      expect(appConfig.appName).toBe('Customer Alias Manager');
    });

    it('has shortName set to "CAM"', () => {
      expect(appConfig.shortName).toBe('CAM');
    });

    it('has defaultPageSize of 25', () => {
      expect(appConfig.defaultPageSize).toBe(25);
    });

    it('has maxPageSize of 100', () => {
      expect(appConfig.maxPageSize).toBe(100);
    });

    it('has graphql.uri defaulting to /graphql', () => {
      expect(appConfig.graphql.uri).toBe('/graphql');
    });

    it('has a non-empty assetClasses array', () => {
      expect(appConfig.assetClasses.length).toBeGreaterThan(0);
      expect(appConfig.assetClasses).toContain('Equity');
      expect(appConfig.assetClasses).toContain('Fixed Income');
    });
  });

  describe('navigation', () => {
    it('has Resolve as the first navigation item at /', () => {
      const resolve = appConfig.navigation.find((n) => n.name === 'Resolve');
      expect(resolve).toBeDefined();
      expect(resolve!.path).toBe('/');
    });

    it('has Mappings navigation item at /mappings', () => {
      const mappings = appConfig.navigation.find((n) => n.name === 'Mappings');
      expect(mappings).toBeDefined();
      expect(mappings!.path).toBe('/mappings');
    });

    it('has exactly 2 navigation items', () => {
      expect(appConfig.navigation).toHaveLength(2);
    });

    it('each navigation item has name and path', () => {
      appConfig.navigation.forEach((item) => {
        expect(typeof item.name).toBe('string');
        expect(typeof item.path).toBe('string');
        expect(item.name.length).toBeGreaterThan(0);
        expect(item.path.length).toBeGreaterThan(0);
      });
    });
  });
});
