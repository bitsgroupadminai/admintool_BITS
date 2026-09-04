import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  documentHasEligibilityCriteria,
  flattenDocumentEligibility,
  offeringHasEligibilityConfigured,
  rulesFromDocumentEligibility,
  eligibilityFromGenericRules,
  requiredSubjectsMissingThreshold,
} from '../src/shared/helpers/documentEligibility.helper.js';
import { getOfferingCompleteness } from '../src/shared/helpers/offeringCompleteness.helper.js';

describe('document eligibility', () => {
  test('converts per-document criteria into evaluation rules', () => {
    const rules = rulesFromDocumentEligibility({
      enabled: true,
      aggregateMin: 75,
      subjectThreshold: 60,
      requiredSubjects: [{ name: 'Physics' }, { name: 'Chemistry', minScore: 70 }, { name: 'Mathematics' }],
    });
    assert.equal(rules.find((rule) => rule.field === 'Qualification'), undefined);
    assert.equal(rules.find((rule) => rule.field === 'Subjects').value, 'Physics, Chemistry, Mathematics');
    assert.equal(rules.find((rule) => rule.field === 'Aggregate Requirement').value, 75);
    assert.equal(rules.find((rule) => rule.field === 'Subject Threshold').value, 60);
  });

  test('disabled documents contribute no rules', () => {
    assert.equal(
      rulesFromDocumentEligibility({
        enabled: false,
        aggregateMin: 75,
        requiredSubjects: [{ name: 'Physics' }],
      }).length,
      0,
    );
    assert.equal(documentHasEligibilityCriteria({ enabled: false, aggregateMin: 75 }), false);
  });

  test('completeness uses per-document criteria instead of a global rule list', () => {
    const offering = {
      documentRequirements: [
        {
          name: 'Class 12 marksheet',
          required: true,
          eligibility: {
            enabled: true,
            aggregateMin: 75,
            requiredSubjects: [{ name: 'Physics' }],
          },
        },
        { name: 'Passport photo', required: true, eligibility: { enabled: false } },
      ],
      workflowSteps: [
        {
          stepId: 's1',
          order: 1,
          name: 'Review',
          handledBy: { type: 'staff', assignee: 'approver' },
          slaValue: 1,
          slaUnit: 'days',
          outcomes: [{ type: 'approved', route: { action: 'end_workflow', terminalState: 'completed' } }],
        },
      ],
      queueMode: 'queue_only',
      queueConfig: { capacity: 10 },
    };
    assert.equal(offeringHasEligibilityConfigured(offering), true);
    assert.equal(getOfferingCompleteness(offering).missing.includes('eligibility_rules'), false);
    assert.equal(flattenDocumentEligibility(offering.documentRequirements).length > 0, true);
  });

  test('legacy offerings with only programme-level rules remain complete', () => {
    assert.equal(
      offeringHasEligibilityConfigured({
        eligibilityRules: [{ field: 'Marks', fieldType: 'numeric', operator: 'gte', value: 60 }],
        documentRequirements: [{ name: 'Class 12 marksheet', required: true }],
      }),
      true,
    );
  });

  test('academic documents without criteria keep a new offering incomplete', () => {
    assert.equal(
      offeringHasEligibilityConfigured({
        eligibilityRules: [],
        documentRequirements: [{ name: 'Class 12 marksheet', required: true }],
      }),
      false,
    );
  });

  test('maps extracted programme rules onto score fields only', () => {
    const template = eligibilityFromGenericRules([
      { field: 'Qualification', fieldType: 'text', operator: 'eq', value: '10+2 or equivalent' },
      { field: 'Subjects', fieldType: 'text', operator: 'eq', value: 'Physics, Chemistry, Mathematics' },
      { field: 'Aggregate Requirement', fieldType: 'numeric', operator: 'gte', value: 75 },
      { field: 'Subject Threshold', fieldType: 'numeric', operator: 'gte', value: 60 },
    ]);
    assert.equal(template.enabled, true);
    assert.equal(template.qualification, '');
    assert.equal(template.aggregateMin, 75);
    assert.equal(template.subjectThreshold, 60);
    assert.deepEqual(template.requiredSubjects, []);
  });

  test('required subjects need a default or per-subject minimum', () => {
    assert.equal(
      requiredSubjectsMissingThreshold({
        enabled: true,
        requiredSubjects: [{ name: 'Physics' }, { name: 'Chemistry' }],
      }),
      true,
    );
    assert.equal(
      requiredSubjectsMissingThreshold({
        enabled: true,
        subjectThreshold: 60,
        requiredSubjects: [{ name: 'Physics' }],
      }),
      false,
    );
  });
});
