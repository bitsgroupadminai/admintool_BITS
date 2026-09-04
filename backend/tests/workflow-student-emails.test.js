import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

const {
  applyCanonicalStudentEmails,
  buildStudentEmailVars,
  canonicalStudentEmailTemplate,
  classifyWorkflowEmailKind,
  interpolateStudentEmail,
} = await import('../src/shared/helpers/workflowStudentEmail.helper.js');

const { buildWorkflowStepEmail } = await import('../src/shared/templates/workflowStepEmails.js');

describe('workflow student emails', () => {
  it('classifies offer release and writes congratulatory copy with next steps', () => {
    const email = canonicalStudentEmailTemplate({ name: 'Offer Release', order: 4 });
    assert.match(email.subject, /congratulat/i);
    assert.match(email.body, /eligible/i);
    assert.match(email.body, /Fee payment/i);
    assert.match(email.body, /\{\{dashboardUrl\}\}/);
    assert.match(email.body, /\{\{paymentMethods\}\}/);
    assert.match(email.body, /\{\{paymentAmount\}\}/);
    assert.match(email.body, /Admission confirmation/i);
    assert.match(email.body, /\{\{courseStartDate\}\}/);
    assert.match(email.body, /\{\{accommodationDetails\}\}/);
  });

  it('interpolates payment amount, dashboard link, and methods', () => {
    const vars = buildStudentEmailVars(
      { applicantName: 'Asha', serviceId: 'svc1' },
      {
        offeringName: 'B.E. Computer Science',
        serviceName: 'Admissions',
        instituteName: 'BITS',
        studentPortalUrl: 'https://student.example.com',
      },
      {
        paymentConfig: { enabled: true, amount: 25000, currency: 'INR', label: 'Admission fee' },
        startDate: new Date('2026-08-01T00:00:00.000Z'),
        visitLocation: 'Pilani campus',
      },
    );
    assert.equal(vars.dashboardUrl, 'https://student.example.com/services/svc1');
    assert.match(vars.paymentAmount, /25,000/);
    assert.match(vars.paymentMethods, /UPI/);
    const body = interpolateStudentEmail(
      canonicalStudentEmailTemplate({ name: 'Offer Release' }).body,
      vars,
    );
    assert.match(body, /Asha/);
    assert.match(body, /https:\/\/student\.example\.com\/services\/svc1/);
    assert.match(body, /Admission fee/);
  });

  it('keeps existing templates when filling canonical emails', () => {
    const steps = applyCanonicalStudentEmails([
      {
        order: 1,
        name: 'Document Verification',
        studentEmail: { subject: 'Custom', headline: 'Hi', body: 'Keep me' },
      },
      { order: 4, name: 'Offer Release' },
    ]);
    assert.equal(steps[0].studentEmail.subject, 'Custom');
    assert.match(steps[1].studentEmail.body, /Congratulations/i);
  });

  it('builds a sendable offer-release email with dashboard CTA', () => {
    const mail = buildWorkflowStepEmail({
      application: { applicantName: 'Asha', applicantEmail: 'asha@example.com', serviceId: 'svc1' },
      step: { stepId: 's4', order: 4, name: 'Offer Release' },
      steps: [
        { stepId: 's4', order: 4, name: 'Offer Release' },
        { stepId: 's5', order: 5, name: 'Fee Payment' },
      ],
      context: {
        serviceName: 'Admissions',
        offeringName: 'B.E. Computer Science',
        instituteName: 'BITS',
        studentPortalUrl: 'https://student.example.com',
        nextStepName: 'Fee Payment',
      },
      offering: {
        paymentConfig: { enabled: true, amount: 48000, currency: 'INR', label: 'Admission fee' },
        visitLocation: 'Pilani',
        visitInstructions: 'Hostel allotment is shared after confirmation.',
      },
    });
    assert.match(mail.subject, /congratulat/i);
    assert.match(mail.html, /Open your dashboard/);
    assert.match(mail.html, /services\/svc1/);
    assert.match(mail.text, /48,000/);
    assert.equal(classifyWorkflowEmailKind('Offer Release'), 'offer_release');
  });
});
