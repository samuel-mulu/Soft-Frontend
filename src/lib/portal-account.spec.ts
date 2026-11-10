import {
  buildBottleSummaryLines,
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
    expect(portalBottleMovementLabel('COMPENSATION', -36).title).toContain('3 dz');
    expect(portalBottleMovementLabel('COMPENSATION', -36).title).toContain('compensation');
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

describe('buildBottleSummaryLines', () => {
  it('uses bottlesPerDozen from bottle types (not default 12)', () => {
    const lines = buildBottleSummaryLines(
      [{ bottleTypeId: 'pepsi', outstanding: 984 }],
      [{ id: 'pepsi', name: 'Pepsi', bottlesPerDozen: 24 }],
    );
    expect(lines[0].perDozen).toBe(24);
    expect(lines[0].owed).toBe(984);
  });

  it('falls back to 12 when bottlesPerDozen is missing (would double a 24-pack)', () => {
    const lines = buildBottleSummaryLines(
      [{ bottleTypeId: 'pepsi', outstanding: 984 }],
      [{ id: 'pepsi', name: 'Pepsi' }],
    );
    expect(lines[0].perDozen).toBe(12);
  });
});
