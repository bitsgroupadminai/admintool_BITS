import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Isolate env before importing module under test
process.env.NODE_ENV = 'test';
process.env.SMTP_USER = 'bits.group.admin.ai@gmail.com';
process.env.SMTP_FROM = 'EduPortal <powerfulindia850@gmail.com>';
process.env.SMTP_PASS = 'xxxx xxxx xxxx xxxx';
process.env.SMTP_HOST = 'smtp.gmail.com';

const { resolveSmtpFrom } = await import('../src/core/services/email.service.js');

describe('resolveSmtpFrom', () => {
  it('forces From address to SMTP_USER when SMTP_FROM uses a different mailbox', () => {
    const from = resolveSmtpFrom();
    assert.match(from, /bits\.group\.admin\.ai@gmail\.com/i);
    assert.doesNotMatch(from, /powerfulindia850@gmail\.com/i);
  });
});
