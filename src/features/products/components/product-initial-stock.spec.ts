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
      dozen: '100',
    };
    const payload = buildProductCreateStockPayload(f, true);
    expect(payload.initialFromExistingEmpties).toBe(1200);
    expect(payload.initialQuantity).toBeUndefined();
  });

  it('maps WITH_BOTTLES to initialQuantity only', () => {
    const f = {
      ...defaultInitialStockFields(),
      enableInitialStock: true,
      receiveMode: 'WITH_BOTTLES' as const,
      dozen: '150.5',
    };
    const payload = buildProductCreateStockPayload(f, true);
    expect(payload.initialQuantity).toBe(1806);
    expect(payload.initialFromExistingEmpties).toBeUndefined();
  });

  it('maps MIXED to both fields', () => {
    const f = {
      ...defaultInitialStockFields(),
      enableInitialStock: true,
      receiveMode: 'MIXED_SOURCE' as const,
      mixedFromDozen: '100',
      mixedSupDozen: '150',
    };
    const payload = buildProductCreateStockPayload(f, true);
    expect(payload.initialFromExistingEmpties).toBe(1200);
    expect(payload.initialQuantity).toBe(1800);
  });

  it('allows a blank edit quantity so product details can save without a receive', () => {
    const f = {
      ...defaultInitialStockFields(),
      enableInitialStock: true,
      receiveMode: 'WITH_BOTTLES' as const,
      dozen: '',
    };
    expect(validateInitialStock(f, true, 0, { allowZero: true })).toBeNull();
    expect(buildProductCreateStockPayload(f, true)).toEqual({});
  });

  it('validates insufficient empties', () => {
    const f = {
      ...defaultInitialStockFields(),
      enableInitialStock: true,
      receiveMode: 'MIXED_SOURCE' as const,
      mixedFromDozen: '100',
      mixedSupDozen: '150',
    };
    expect(validateInitialStock(f, true, 3000)).toBeNull();
    expect(validateInitialStock(f, true, 500)).toMatch(/Not enough empty/);
  });

  it('rejects quantities that are not half-dozen steps', () => {
    const f = {
      ...defaultInitialStockFields(),
      enableInitialStock: true,
      receiveMode: 'WITH_BOTTLES' as const,
      dozen: '1.3',
    };
    expect(validateInitialStock(f, true, 0)).toMatch(/half dozens/);
  });
});
