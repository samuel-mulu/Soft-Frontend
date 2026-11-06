import {
  HALF_DOZEN,
  UNITS_PER_DOZEN,
  bottlesToDozen,
  dozenToBottles,
  formatDozen,
  formatSignedDozen,
  isHalfDozenBottles,
  isValidDozenField,
  parseDozenField,
  perDozenTotal,
  projectBottleInternal,
  safeDozenToBottles,
} from './pack-quantity';
import { toDisplayBottle } from './customer-balance';

describe('dozen-only quantities', () => {
  it('converts dozen to bottles', () => {
    expect(dozenToBottles('2')).toBe(24);
    expect(dozenToBottles('2.5')).toBe(30);
    expect(dozenToBottles('0.5')).toBe(6);
    expect(dozenToBottles('')).toBe(0);
  });

  it('rejects values that are not half-dozen steps', () => {
    expect(() => parseDozenField('1.3')).toThrow();
    expect(() => parseDozenField('-1')).toThrow();
    expect(() => parseDozenField('abc')).toThrow();
    expect(isValidDozenField('1.5')).toBe(true);
    expect(isValidDozenField('1.25')).toBe(false);
    expect(safeDozenToBottles('1.3')).toBe(0);
  });

  it('bottles back to dozen', () => {
    expect(bottlesToDozen(30)).toBe(2.5);
    expect(isHalfDozenBottles(18)).toBe(true);
    expect(isHalfDozenBottles(7)).toBe(false);
  });

  it('formats dozens', () => {
    expect(formatDozen(30)).toBe('2.5 dz');
    expect(formatDozen(24)).toBe('2 dz');
    expect(formatDozen(0)).toBe('0 dz');
    expect(formatSignedDozen(-30)).toBe('−2.5 dz');
    expect(formatSignedDozen(12)).toBe('+1 dz');
    expect(formatSignedDozen(0)).toBe('0 dz');
  });

  it('per-dozen money totals', () => {
    expect(perDozenTotal(300, 30)).toBe(750);
    expect(perDozenTotal('310', 24)).toBe(620);
    expect(perDozenTotal(25, 6)).toBe(12.5);
  });

  it('constants', () => {
    expect(UNITS_PER_DOZEN).toBe(12);
    expect(HALF_DOZEN).toBe(6);
  });
});

describe('bottle balance scenarios (internal ledger, display sign)', () => {
  it('sell 2 dozen, return 2 dozen → zero', () => {
    expect(projectBottleInternal(0, 24, 24)).toBe(0);
    expect(toDisplayBottle(0)).toBe(0);
  });

  it('sell 1.5 dz, return 1 dz → customer holds 0.5 dz', () => {
    const after = projectBottleInternal(0, 18, 12);
    expect(after).toBe(6);
    expect(toDisplayBottle(after)).toBe(-6);
  });

  it('over-return shows credit', () => {
    const after = projectBottleInternal(0, 12, 18);
    expect(after).toBe(-6);
    expect(toDisplayBottle(after)).toBe(6);
  });
});
