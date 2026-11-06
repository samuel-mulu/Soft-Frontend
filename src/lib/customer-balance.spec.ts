import {
  aggregateCustomersBottleBalances,
  bottleLedgerTotals,
  formatDisplayBottle,
  formatDisplayMoney,
  presentCustomerBalance,
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
    expect(formatDisplayBottle(-24)).toBe('−2 dz');
    expect(formatDisplayBottle(6)).toBe('+0.5 dz');
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

  it('shows the same money sign to staff and customer', () => {
    const debt = presentCustomerBalance(1000, 'money', 'staff');
    const debtPortal = presentCustomerBalance(1000, 'money', 'customer');
    expect(debt.display).toBe(-1000);
    expect(debtPortal.display).toBe(debt.display);
    expect(debt.tone).toBe('danger');
    expect(debtPortal.tone).toBe('danger');
    expect(debt.label).toMatch(/Customer owes/);
    expect(debtPortal.label).toMatch(/You need to pay/);

    const credit = presentCustomerBalance(-1000, 'money', 'staff');
    const creditPortal = presentCustomerBalance(-1000, 'money', 'customer');
    expect(credit.display).toBe(1000);
    expect(creditPortal.display).toBe(credit.display);
    expect(credit.tone).toBe('success');
    expect(credit.label).toMatch(/credit/);
    expect(creditPortal.label).toMatch(/You have/);
  });

  it('tracks payments from debt through overpayment without a second flip', () => {
    expect(presentCustomerBalance(1000, 'money').display).toBe(-1000);
    expect(presentCustomerBalance(600, 'money').display).toBe(-600);
    expect(presentCustomerBalance(0, 'money').display).toBe(0);
    expect(presentCustomerBalance(0, 'money').tone).toBe('neutral');
    expect(presentCustomerBalance(-200, 'money').display).toBe(200);
    expect(presentCustomerBalance(-200, 'money').tone).toBe('success');
  });

  it('tracks bottle issue, return, settle, and over-return', () => {
    expect(presentCustomerBalance(100, 'bottle').display).toBe(-100);
    expect(presentCustomerBalance(40, 'bottle').display).toBe(-40);
    expect(presentCustomerBalance(0, 'bottle').display).toBe(0);
    expect(presentCustomerBalance(-20, 'bottle').display).toBe(20);
    expect(presentCustomerBalance(-20, 'bottle', 'customer').label).toMatch(/1\.67 dz credit/);
    expect(presentCustomerBalance(100, 'bottle', 'staff').label).toMatch(/Customer owes 8\.33 dz/);
  });

  it('compensation clears bottles and adds money debt once', () => {
    const bottlesBefore = presentCustomerBalance(100, 'bottle');
    const bottlesAfter = presentCustomerBalance(0, 'bottle');
    const moneyBefore = presentCustomerBalance(0, 'money');
    const moneyAfter = presentCustomerBalance(1000, 'money');
    expect(bottlesBefore.display).toBe(-100);
    expect(bottlesAfter.display).toBe(0);
    expect(moneyBefore.display).toBe(0);
    expect(moneyAfter.display).toBe(-1000);
    expect(toDisplayMoney(toDisplayMoney(1000))).not.toBe(-1000);
  });

  it('splits bottle ledger into with-customer vs from-customer', () => {
    expect(bottleLedgerTotals([{ outstanding: 50 }])).toMatchObject({
      withCustomer: 50,
      fromCustomer: 0,
      netInternal: 50,
    });
    expect(bottleLedgerTotals([{ outstanding: 50 }, { outstanding: -5 }])).toMatchObject({
      withCustomer: 50,
      fromCustomer: 5,
      netInternal: 45,
    });
    expect(
      aggregateCustomersBottleBalances([
        { bottleBalances: [{ outstanding: 50 }] },
        { bottleBalances: [{ outstanding: -3 }] },
      ]),
    ).toMatchObject({ withCustomer: 50, fromCustomer: 3, netInternal: 47 });
  });

  it('sums mixed bottle sizes in dozens', () => {
    const sizeOf = (id: string) => (id === 'big' ? 24 : 12);
    const totals = aggregateCustomersBottleBalances(
      [
        { bottleBalances: [{ bottleTypeId: 'big', outstanding: 48 }] },
        { bottleBalances: [{ bottleTypeId: 'small', outstanding: 24 }] },
      ],
      sizeOf,
    );
    expect(totals.withCustomerDozen).toBe(4);
  });
});
