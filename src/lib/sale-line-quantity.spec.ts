import { emptySaleLine, lineReturnedEach, lineSoldEach } from './sale-line-quantity';
import { projectBottleInternal } from './pack-quantity';
import { toDisplayBottle } from './customer-balance';

describe('sale line quantity helpers', () => {
  it('11: changing modes does not double-count when fields are mode-specific', () => {
    const line = emptySaleLine();
    line.qtyMode = 'dozen';
    line.soldDozen = '2';
    line.soldEach = '99';
    expect(lineSoldEach(line)).toBe(24);

    line.qtyMode = 'each';
    line.soldEach = '5';
    expect(lineSoldEach(line)).toBe(5);
  });

  it('mixed sold and each return independently', () => {
    const line = { ...emptySaleLine(), qtyMode: 'mixed' as const, soldDozen: '1', soldEach: '6' };
    line.retMode = 'each';
    line.retEach = '5';
    expect(lineSoldEach(line)).toBe(18);
    expect(lineReturnedEach(line)).toBe(5);
  });

  it('return dozen mode', () => {
    const line = { ...emptySaleLine(), retMode: 'dozen' as const, retDozen: '2' };
    expect(lineReturnedEach(line)).toBe(24);
  });

  it('projected display after partial return', () => {
    const line = { ...emptySaleLine(), qtyMode: 'mixed' as const, soldDozen: '1', soldEach: '6' };
    line.retMode = 'dozen';
    line.retDozen = '1';
    const internal = projectBottleInternal(0, lineSoldEach(line), lineReturnedEach(line));
    expect(toDisplayBottle(internal)).toBe(-6);
  });
});
