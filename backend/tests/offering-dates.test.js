import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calendarDateInTimeZone,
  isWithinOfferingDates,
} from '../src/shared/helpers/offeringDates.helper.js';

describe('offeringDates', () => {
  it('maps IST midnight to the India calendar day', () => {
    // 17 Aug 2026 00:00 IST
    assert.equal(calendarDateInTimeZone('2026-08-16T18:30:00.000Z'), '2026-08-17');
  });

  it('treats start/end as inclusive calendar days in IST', () => {
    const now = new Date('2026-08-16T22:00:00.000Z'); // 17 Aug 03:30 IST
    assert.equal(
      isWithinOfferingDates(
        {
          startDate: new Date('2026-08-16T18:30:00.000Z'), // 17 Aug 00:00 IST
          endDate: new Date('2026-08-31T18:29:59.000Z'),
        },
        now,
      ),
      true,
    );
    assert.equal(
      isWithinOfferingDates(
        {
          // 18 Aug 00:00 IST — not yet open on 17 Aug
          startDate: new Date('2026-08-17T18:30:00.000Z'),
          endDate: new Date('2026-08-31T18:29:59.000Z'),
        },
        now,
      ),
      false,
    );
  });
});
