import {
  buildInitialRegistrationPayload,
  defaultInitialRegistrationFields,
  validateInitialRegistration,
} from './customer-initial-registration';

describe('customer initial registration', () => {
  it('ignores opening fields when checkbox is off', () => {
    const fields = defaultInitialRegistrationFields();
    fields.openingMoneyAmount = '100';
    expect(validateInitialRegistration(fields)).toBeNull();
    expect(buildInitialRegistrationPayload(fields)).toEqual({});
  });

  it('builds money and bottle opening payload', () => {
    const fields = defaultInitialRegistrationFields();
    fields.enableInitialRegistration = true;
    fields.openingMoneyAmount = '500';
    fields.openingMoneyDirection = 'OWES';
    fields.openingBottles = [
      { key: '1', bottleTypeId: 'bt-1', dozen: '2.5', direction: 'CREDIT' },
    ];
    expect(validateInitialRegistration(fields)).toBeNull();
    expect(buildInitialRegistrationPayload(fields)).toEqual({
      initialRegistration: true,
      openingMoneyAmount: '500',
      openingMoneyDirection: 'OWES',
      openingBottles: [{ bottleTypeId: 'bt-1', quantityDozen: 2.5, direction: 'CREDIT' }],
    });
  });

  it('rejects invalid dozen', () => {
    const fields = defaultInitialRegistrationFields();
    fields.enableInitialRegistration = true;
    fields.openingBottles = [
      { key: '1', bottleTypeId: 'bt-1', dozen: '1.2', direction: 'OWES' },
    ];
    expect(validateInitialRegistration(fields)).toMatch(/half dozen/i);
  });
});
