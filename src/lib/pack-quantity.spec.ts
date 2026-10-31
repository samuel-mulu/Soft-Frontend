import {
  UNITS_PER_DOZEN,
  assertWholeNonNegative,
  formatEachBreakdown,
  formatSignedDozenEach,
  fromEach,
  projectBottleInternal,
  qtyFromMode,
  toEach,
} from './pack-quantity';
import { toDisplayBottle } from './customer-balance';

describe('pack-quantity conversion', () => {
  it('1: sell 2 dozen → 24 each', () => {
    expect(toEach({ dozen: 2, each: 0, unitsPerDozen: 12 })).toBe(24);
  });

  it('2: sell 1 dozen + 6 each → 18 each', () => {
    expect(toEach({ dozen: 1, each: 6, unitsPerDozen: 12 })).toBe(18);
  });

  it('3: return 1 dozen → 12 each', () => {
    expect(toEach({ dozen: 1, each: 0, unitsPerDozen: 12 })).toBe(12);
  });

  it('4: return 1 dozen + 3 each → 15 each', () => {
    expect(toEach({ dozen: 1, each: 3, unitsPerDozen: 12 })).toBe(15);
  });

  it('fromEach breakdown examples', () => {
    expect(fromEach(14)).toEqual({ dozen: 1, each: 2 });
    expect(fromEach(26)).toEqual({ dozen: 2, each: 2 });
  });

  it('10: display mode does not change internal totals', () => {
    const internal = 26;
    expect(toDisplayBottle(internal)).toBe(-26);
    expect(formatSignedDozenEach(-26)).toBe('−(2 dz + 2 ea)');
    expect(toDisplayBottle(internal)).toBe(-26);
  });

  it('signed dozen+each display', () => {
    expect(formatSignedDozenEach(-26)).toBe('−(2 dz + 2 ea)');
    expect(formatSignedDozenEach(15)).toBe('+(1 dz + 3 ea)');
  });

  it('12: rejects negative and fractional', () => {
    expect(() => assertWholeNonNegative(-1)).toThrow();
    expect(() => toEach({ dozen: 1.5, each: 0, unitsPerDozen: 12 })).toThrow();
  });

  it('qtyFromMode each/dozen/mixed', () => {
    expect(qtyFromMode('each', '', '5')).toBe(5);
    expect(qtyFromMode('dozen', '2', '')).toBe(24);
    expect(qtyFromMode('mixed', '1', '6')).toBe(18);
  });

  it('formatEachBreakdown', () => {
    expect(formatEachBreakdown(27)).toBe('2 dozen + 3 each');
  });
});

describe('bottle balance scenarios (internal ledger, display sign)', () => {
  it('5: sell 2 dozen, return 2 dozen → zero new bottle delta from sale', () => {
    const issued = 24;
    const returned = 24;
    expect(projectBottleInternal(0, issued, returned)).toBe(0);
    expect(toDisplayBottle(0)).toBe(0);
  });

  it('6: sell 18, return 12 → internal +6 (customer holds 6)', () => {
    const after = projectBottleInternal(0, 18, 12);
    expect(after).toBe(6);
    expect(toDisplayBottle(after)).toBe(-6);
  });

  it('7: sell 10, return 15 → internal −5 (over-return)', () => {
    const after = projectBottleInternal(0, 10, 15);
    expect(after).toBe(-5);
    expect(toDisplayBottle(after)).toBe(5);
  });

  it('8: existing +20 held, sell 10, return 35 → internal −5, display +5 GREEN', () => {
    const after = projectBottleInternal(20, 10, 35);
    expect(after).toBe(-5);
    expect(toDisplayBottle(after)).toBe(5);
  });

  it('9: separate bottle types stay separate', () => {
    const typeA = projectBottleInternal(10, 5, 2);
    const typeB = projectBottleInternal(0, 12, 0);
    expect(typeA).toBe(13);
    expect(typeB).toBe(12);
    expect(typeA).not.toBe(typeB);
  });
});

describe('units per dozen is fixed at 12', () => {
  it('rejects non-12 conversion factor', () => {
    expect(() => toEach({ dozen: 1, each: 0, unitsPerDozen: 10 })).toThrow();
  });

  it('UNITS_PER_DOZEN constant', () => {
    expect(UNITS_PER_DOZEN).toBe(12);
  });
});
