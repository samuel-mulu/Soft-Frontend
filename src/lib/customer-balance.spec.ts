import {
  aggregateCustomersBottleBalances,
  bottleLedgerTotals,
  formatDisplayBottle,
  formatDisplayMoney,
  projectDisplayBottle,
  projectDisplayMoney,
  toDisplayBottle,
  toDisplayMoney,
} from './customer-balance';

describe('customer-balance display', () => {
  it('formats money with explicit signs', () => {
    expect(formatDisplayMoney(-100)).toBe('−100.00 ETB');
    expect(formatDisplayMoney(400)).toBe('+400.00 ETB');
    expect(formatDisplayMoney(0)).toBe('0 ETB');
  });

  it('formats bottles', () => {
    expect(formatDisplayBottle(-8)).toBe('−8');
    expect(formatDisplayBottle(2)).toBe('+2');
  });

  it('projects sale money balance', () => {
    expect(projectDisplayMoney(0, 1000, 900)).toBe(-100);
    expect(projectDisplayMoney(500, 1000, 2000)).toBe(500);
  });

  it('projects bottle balance per type', () => {
    expect(projectDisplayBottle(20, 10, 35)).toBe(5);
    expect(projectDisplayBottle(0, 10, 15)).toBe(5);
  });

  it('matches backend sign convention', () => {
    expect(toDisplayMoney(100)).toBe(-100);
    expect(toDisplayBottle(8)).toBe(-8);
  });

  it('splits bottle ledger into with-customer vs from-customer', () => {
    expect(bottleLedgerTotals([{ outstanding: 50 }])).toEqual({
      withCustomer: 50,
      fromCustomer: 0,
      netInternal: 50,
    });
    expect(bottleLedgerTotals([{ outstanding: 50 }, { outstanding: -5 }])).toEqual({
      withCustomer: 50,
      fromCustomer: 5,
      netInternal: 45,
    });
    expect(
      aggregateCustomersBottleBalances([
        { bottleBalances: [{ outstanding: 50 }] },
        { bottleBalances: [{ outstanding: -3 }] },
      ]),
    ).toEqual({ withCustomer: 50, fromCustomer: 3, netInternal: 47 });
  });
});
