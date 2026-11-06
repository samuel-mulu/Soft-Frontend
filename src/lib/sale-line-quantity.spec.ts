import {
  emptySaleLine,
  lineReturnedEach,
  lineSoldEach,
  lineSoldEachStrict,
  soldQtyLabel,
} from './sale-line-quantity';
import { projectBottleInternal } from './pack-quantity';
import { toDisplayBottle } from './customer-balance';

describe('sale line quantity helpers (dozen only)', () => {
  it('sold dozen → bottles', () => {
    const line = { ...emptySaleLine(), soldDozen: '2' };
    expect(lineSoldEach(line)).toBe(24);
    expect(soldQtyLabel(line)).toBe('2 dz');
  });

  it('half dozens', () => {
    const line = { ...emptySaleLine(), soldDozen: '1.5', retDozen: '0.5' };
    expect(lineSoldEach(line)).toBe(18);
    expect(lineReturnedEach(line)).toBe(6);
  });

  it('invalid step is 0 in preview and throws in strict mode', () => {
    const line = { ...emptySaleLine(), soldDozen: '1.3' };
    expect(lineSoldEach(line)).toBe(0);
    expect(() => lineSoldEachStrict(line)).toThrow();
  });

  it('uses the product dozen size', () => {
    const line = { ...emptySaleLine(), soldDozen: '1.5' };
    expect(lineSoldEach(line, 24)).toBe(36);
    expect(soldQtyLabel(line, 24)).toBe('1.5 dz');
  });

  it('projected display after partial return', () => {
    const line = { ...emptySaleLine(), soldDozen: '1.5', retDozen: '1' };
    const internal = projectBottleInternal(0, lineSoldEach(line), lineReturnedEach(line));
    expect(toDisplayBottle(internal)).toBe(-6);
  });
});
