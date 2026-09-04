import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

const {
  PRODUCTION_ADMIN_PORTAL,
  PRODUCTION_STUDENT_PORTAL,
  resolvePortalUrl,
} = await import('../src/shared/helpers/portalUrls.helper.js');
const {
  buildIntakeApprovedEmail,
  buildStaffWelcomeEmail,
  buildStatusUpdateEmail,
} = await import('../src/shared/templates/applicationEmails.js');
const { stripLeadingEmailGreeting, buildHtmlEmail } = await import(
  '../src/shared/templates/emailLayout.js'
);

describe('resolvePortalUrl', () => {
  it('rewrites the retired student Vercel domain', () => {
    assert.equal(
      resolvePortalUrl('https://eduportal-student.vercel.app', 'student'),
      PRODUCTION_STUDENT_PORTAL,
    );
  });

  it('keeps localhost student URLs for local development', () => {
    assert.equal(resolvePortalUrl('http://localhost:5174', 'student'), 'http://localhost:5174');
  });

  it('rewrites the retired admin Vercel domain', () => {
    assert.equal(
      resolvePortalUrl('https://eduportal-admin.vercel.app', 'admin'),
      PRODUCTION_ADMIN_PORTAL,
    );
  });
});

describe('email greetings', () => {
  it('strips a leading Dear line from HTML and plain bodies', () => {
    assert.equal(
      stripLeadingEmailGreeting('Dear Harangad Singh Ghai,\n\nWelcome to BITS P.'),
      'Welcome to BITS P.',
    );
    assert.equal(
      stripLeadingEmailGreeting('<p>Hello Asha,</p><p>Your request is under review.</p>'),
      '<p>Your request is under review.</p>',
    );
    assert.equal(
      stripLeadingEmailGreeting('Hello Asha,<br/>Your seat is ready.'),
      'Your seat is ready.',
    );
  });

  it('keeps a single Hello when the layout intro already greets the student', () => {
    const html = buildHtmlEmail({
      headline: 'Welcome to BITS P',
      intro: 'Hello Harangad Singh Ghai,',
      body: 'Dear Harangad Singh Ghai,<br/>Welcome to BITS P — your admission has been confirmed.',
      instituteName: 'BITS P',
    });
    assert.equal((html.match(/Hello Harangad Singh Ghai/gi) ?? []).length, 1);
    assert.doesNotMatch(html, /Dear Harangad Singh Ghai/);
    assert.match(html, /your admission has been confirmed/);
  });
});

describe('application emails', () => {
  it('puts the current student portal login URL in authorization mail', () => {
    const mail = buildIntakeApprovedEmail({
      applicantName: 'BHUPESH KUMAR',
      serviceName: 'Enrollment',
      offeringName: 'B.E. Computer Science',
      instituteName: 'CMRU',
      studentPortalUrl: PRODUCTION_STUDENT_PORTAL,
      email: 'web2.02912@gmail.com',
      temporaryPassword: 'temp-pass',
    });
    assert.match(mail.text, /campusflow-student-smoky\.vercel\.app\/login/);
    assert.doesNotMatch(mail.html, /eduportal-student\.vercel\.app/);
  });

  it('builds a status email even when status was passed as the context string', () => {
    const mail = buildStatusUpdateEmail({
      applicantName: 'Student',
      status: 'admitted',
      serviceName: 'Enrollment',
      offeringName: 'B.E. Computer Science',
      instituteName: 'CMRU',
      studentPortalUrl: PRODUCTION_STUDENT_PORTAL,
    });
    assert.match(mail.subject, /approved/i);
    assert.match(mail.html, /campusflow-student-smoky\.vercel\.app\/services/);
  });

  it('includes staff portal login and credentials', () => {
    const mail = buildStaffWelcomeEmail({
      staffName: 'Anita',
      email: 'anita@example.com',
      staffRoleLabel: 'Approver',
      password: 'TempPass123',
      instituteName: 'CMRU',
      adminPortalUrl: PRODUCTION_ADMIN_PORTAL,
    });
    assert.match(mail.text, /anita@example.com/);
    assert.match(mail.text, /TempPass123/);
    assert.match(mail.html, /campusflow-admin-flame\.vercel\.app\/login/);
  });
});
