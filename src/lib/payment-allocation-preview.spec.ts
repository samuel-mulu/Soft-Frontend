import { previewPaymentAllocation } from './payment-allocation-preview';

describe('previewPaymentAllocation', () => {
  const open = [
    { id: 'c1', remaining: 400, createdAt: '2025-01-01T00:00:00Z' },
    { id: 'c2', remaining: 600, createdAt: '2025-01-02T00:00:00Z' },
  ];

  it('AUTO applies compensation FIFO then sales', () => {
    const r = previewPaymentAllocation({
      paymentAmount: 700,
      mode: 'AUTO',
      drinkOutstanding: 500,
      compensationOutstanding: 1000,
      openCompensations: open,
      moneyOutstanding: 1500,
    });
    expect(r?.toCompensation).toBe(700);
    expect(r?.toSales).toBe(0);
    expect(r?.compensationDebtAfter).toBe(300);
    expect(r?.drinkDebtAfter).toBe(500);
  });

  it('AUTO spills remainder to drink debt', () => {
    const r = previewPaymentAllocation({
      paymentAmount: 900,
      mode: 'AUTO',
      drinkOutstanding: 500,
      compensationOutstanding: 400,
      openCompensations: [{ id: 'c1', remaining: 400, createdAt: '2025-01-01' }],
      moneyOutstanding: 900,
    });
    expect(r?.toCompensation).toBe(400);
    expect(r?.toSales).toBe(500);
    expect(r?.drinkDebtAfter).toBe(0);
  });

  it('SALES skips compensation', () => {
    const r = previewPaymentAllocation({
      paymentAmount: 200,
      mode: 'SALES',
      drinkOutstanding: 500,
      compensationOutstanding: 1000,
      openCompensations: open,
      moneyOutstanding: 1500,
    });
    expect(r?.toCompensation).toBe(0);
    expect(r?.toSales).toBe(200);
    expect(r?.compensationDebtAfter).toBe(1000);
    expect(r?.drinkDebtAfter).toBe(300);
  });
});
