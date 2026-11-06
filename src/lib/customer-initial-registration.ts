import { isValidDozenField, parseDozenField } from '@/lib/pack-quantity';

/** Locked reason for manual → digital customer opening balances (must match backend). */
export const CUSTOMER_OPENING_NOTE = 'Initial from manual to digital';

export type OpeningDirection = 'OWES' | 'CREDIT';

export type OpeningBottleRow = {
  key: string;
  bottleTypeId: string;
  dozen: string;
  direction: OpeningDirection;
};

export type InitialRegistrationFields = {
  enableInitialRegistration: boolean;
  openingMoneyAmount: string;
  openingMoneyDirection: OpeningDirection;
  openingBottles: OpeningBottleRow[];
};

export function defaultInitialRegistrationFields(): InitialRegistrationFields {
  return {
    enableInitialRegistration: false,
    openingMoneyAmount: '',
    openingMoneyDirection: 'OWES',
    openingBottles: [],
  };
}

export function newOpeningBottleRow(): OpeningBottleRow {
  return {
    key: `ob-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    bottleTypeId: '',
    dozen: '',
    direction: 'OWES',
  };
}

/** Validate opening fields when checkbox is on. Returns an error message or null. */
export function validateInitialRegistration(fields: InitialRegistrationFields): string | null {
  if (!fields.enableInitialRegistration) return null;

  const moneyRaw = fields.openingMoneyAmount.trim();
  if (moneyRaw) {
    const money = Number(moneyRaw);
    if (!Number.isFinite(money) || money < 0) return 'Opening money must be zero or a positive amount';
  }

  for (const row of fields.openingBottles) {
    const hasType = !!row.bottleTypeId;
    const hasDozen = row.dozen.trim() !== '';
    if (!hasType && !hasDozen) continue;
    if (!hasType) return 'Choose a bottle type for each opening bottle row';
    if (!hasDozen || !isValidDozenField(row.dozen)) {
      return 'Opening bottle quantity must be a whole or half dozen (e.g. 1, 1.5, 2)';
    }
    try {
      if (parseDozenField(row.dozen) <= 0) return 'Opening bottle quantity must be greater than zero';
    } catch {
      return 'Opening bottle quantity must be a whole or half dozen (e.g. 1, 1.5, 2)';
    }
  }

  return null;
}

export type CustomerCreateOpeningPayload = {
  initialRegistration: true;
  openingMoneyAmount?: string;
  openingMoneyDirection?: OpeningDirection;
  openingBottles?: { bottleTypeId: string; quantityDozen: number; direction: OpeningDirection }[];
};

/** Build opening fields for POST /customers when checkbox is enabled. */
export function buildInitialRegistrationPayload(
  fields: InitialRegistrationFields,
): CustomerCreateOpeningPayload | Record<string, never> {
  if (!fields.enableInitialRegistration) return {};

  const moneyRaw = fields.openingMoneyAmount.trim();
  const money = moneyRaw ? Number(moneyRaw) : 0;
  const bottles = fields.openingBottles
    .filter((r) => r.bottleTypeId && r.dozen.trim() && isValidDozenField(r.dozen))
    .map((r) => ({
      bottleTypeId: r.bottleTypeId,
      quantityDozen: parseDozenField(r.dozen),
      direction: r.direction,
    }))
    .filter((r) => r.quantityDozen > 0);

  const payload: CustomerCreateOpeningPayload = { initialRegistration: true };
  if (money > 0) {
    payload.openingMoneyAmount = String(money);
    payload.openingMoneyDirection = fields.openingMoneyDirection;
  }
  if (bottles.length) payload.openingBottles = bottles;
  return payload;
}
