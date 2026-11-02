import {
  buildProductCreateStockPayload,
  computeInitialStockQuantities,
  defaultInitialStockFields,
  validateInitialStock,
} from './product-initial-stock-logic';

describe('product initial stock', () => {
  it('returns no stock when disabled', () => {
    const f = defaultInitialStockFields();
    expect(computeInitialStockQuantities(f, true)).toEqual({
      fromExisting: 0,
      withSupplier: 0,
      totalFull: 0,
    });
    expect(buildProductCreateStockPayload(f, true)).toEqual({});
  });

  it('maps FROM_EXISTING_EMPTIES to initialFromExistingEmpties only', () => {
    const f = {
      ...defaultInitialStockFields(),
      enableInitialStock: true,
      receiveMode: 'FROM_EXISTING_EMPTIES' as const,
      qtyMode: 'each' as const,
      each: '1000',
    };
    const payload = buildProductCreateStockPayload(f, true);
    expect(payload.initialFromExistingEmpties).toBe(1000);
    expect(payload.initialQuantity).toBeUndefined();
  });

  it('maps WITH_BOTTLES to initialQuantity only', () => {
    const f = {
      ...defaultInitialStockFields(),
      enableInitialStock: true,
      receiveMode: 'WITH_BOTTLES' as const,
      qtyMode: 'each' as const,
      each: '2000',
    };
    const payload = buildProductCreateStockPayload(f, true);
    expect(payload.initialQuantity).toBe(2000);
    expect(payload.initialFromExistingEmpties).toBeUndefined();
  });

  it('maps MIXED to both fields', () => {
    const f = {
      ...defaultInitialStockFields(),
      enableInitialStock: true,
      receiveMode: 'MIXED_SOURCE' as const,
      mixedFromMode: 'each' as const,
      mixedFromEach: '1000',
      mixedSupMode: 'each' as const,
      mixedSupEach: '2000',
    };
    const payload = buildProductCreateStockPayload(f, true);
    expect(payload.initialFromExistingEmpties).toBe(1000);
    expect(payload.initialQuantity).toBe(2000);
  });

  it('validates insufficient empties', () => {
    const f = {
      ...defaultInitialStockFields(),
      enableInitialStock: true,
      receiveMode: 'MIXED_SOURCE' as const,
      mixedFromMode: 'each' as const,
      mixedFromEach: '1000',
      mixedSupMode: 'each' as const,
      mixedSupEach: '2000',
    };
    expect(validateInitialStock(f, true, 3000)).toBeNull();
    expect(validateInitialStock(f, true, 500)).toMatch(/Not enough empty/);
  });
});
