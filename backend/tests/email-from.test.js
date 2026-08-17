import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.EMAIL_FROM = 'CampusFlow <onboarding@resend.dev>';
process.env.RESEND_API_KEY = 're_test_placeholder';
process.env.SMTP_USER = 'bits.group.admin.ai@gmail.com';
process.env.SMTP_FROM = 'CampusFlow <powerfulindia850@gmail.com>';
process.env.SMTP_PASS = 'xxxx xxxx xxxx xxxx';
process.env.SMTP_HOST = 'smtp.gmail.com';

const { resolveEmailFrom, resolveSmtpFrom } = await import('../src/core/services/email.service.js');

describe('email from headers', () => {
  it('uses EMAIL_FROM for Resend', () => {
    assert.equal(resolveEmailFrom(), 'CampusFlow <onboarding@resend.dev>');
  });

  it('forces SMTP From address to SMTP_USER when mailboxes differ', () => {
    const from = resolveSmtpFrom();
    assert.match(from, /bits\.group\.admin\.ai@gmail\.com/i);
    assert.doesNotMatch(from, /powerfulindia850@gmail\.com/i);
  });
});
