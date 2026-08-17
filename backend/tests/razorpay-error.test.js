import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/core/utils/AppError.js';

process.env.NODE_ENV = 'test';

const { mapRazorpayError } = await import('../src/shared/services/razorpay.service.js');

describe('mapRazorpayError', () => {
  it('keeps AppError as-is', () => {
    const original = new AppError('already mapped', 400);
    assert.equal(mapRazorpayError(original), original);
  });

  it('maps provider 401 to 503', () => {
    const mapped = mapRazorpayError({
      statusCode: 401,
      error: { description: 'Authentication failed' },
    });
    assert.equal(mapped.statusCode, 503);
    assert.match(mapped.message, /Authentication failed/);
  });

  it('maps provider 400 description to 400', () => {
    const mapped = mapRazorpayError({
      statusCode: 400,
      error: { description: 'Amount must be at least INR 1.00' },
    });
    assert.equal(mapped.statusCode, 400);
    assert.match(mapped.message, /Amount must be at least/);
  });
});
