import {
  buildPortalPaymentRows,
  portalBottleMovementLabel,
  portalMoneyStatus,
} from './portal-account';

describe('portalMoneyStatus', () => {
  it('settled at zero', () => {
    expect(portalMoneyStatus(0).status).toBe('settled');
  });
  it('owe when internal positive', () => {
    const r = portalMoneyStatus(600);
    expect(r.status).toBe('owe');
    expect(r.amountEtb).toBe(600);
  });
  it('credit when internal negative', () => {
    const r = portalMoneyStatus(-200);
    expect(r.status).toBe('credit');
    expect(r.amountEtb).toBe(200);
  });
});

describe('portalBottleMovementLabel', () => {
  it('formats compensation', () => {
    expect(portalBottleMovementLabel('COMPENSATION', -40).title).toContain('40');
    expect(portalBottleMovementLabel('COMPENSATION', -40).title).toContain('compensation');
  });
});

describe('buildPortalPaymentRows', () => {
  it('emits one row per payment', () => {
    const rows = buildPortalPaymentRows({
      sales: [],
      compensations: [],
      payments: [{ id: 'p1', createdAt: '2025-01-01', amount: '100', purpose: 'GENERAL' }],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].category).toBe('payment');
  });
});
