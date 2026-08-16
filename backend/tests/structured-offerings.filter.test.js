import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractStructuredOfferingsFromText,
  filterProgrammeOfferings,
  isLikelyProgrammeOfferingName,
} from '../src/shared/helpers/structured-offerings.helper.js';

const TOC_AND_WORKFLOW = [
  'Purpose of This Knowledge Document',
  'Campuses Covered',
  'Programmes Covered in This Document',
  'General Admissions Operational Principles',
  'Programme Knowledge Sections',
  'Application submission',
  'Profile screening',
  'Entrance score validation',
  'Interview scheduling',
  'Interview evaluation',
  'Final merit generation',
  'Offer release',
  'Standard Deficiency Handling Rules',
  'Queue and Appointment Handling',
  'AI Chatbot Knowledge Guidelines',
  'Audit and Compliance Requirements',
  'Internal Escalation Matrix',
  'End-of-Cycle Operational Closure',
];

const REAL_PROGRAMMES = [
  'B.E. Computer Science',
  'B.E. Electronics & Electrical Engineering',
  'M.Sc. Economics',
  'M.E. Data Science',
  'MBA in Business Analytics',
];

describe('programme offering filter', () => {
  it('accepts degree programmes only', () => {
    for (const name of REAL_PROGRAMMES) {
      assert.equal(isLikelyProgrammeOfferingName(name), true, name);
    }
    for (const name of TOC_AND_WORKFLOW) {
      assert.equal(isLikelyProgrammeOfferingName(name), false, name);
    }
  });

  it('drops TOC and workflow suggestions mixed with real programmes', () => {
    const mixed = [...REAL_PROGRAMMES, ...TOC_AND_WORKFLOW].map((name) => ({
      name,
      description: '',
      documentExcerpt: name,
    }));
    const filtered = filterProgrammeOfferings(mixed);
    assert.deepEqual(
      filtered.map((o) => o.name),
      REAL_PROGRAMMES,
    );
  });

  it('extracts only the five programmes from a BITS-style knowledge PDF text', () => {
    const doc = `
1. Purpose of This Knowledge Document
2. Campuses Covered
3. Programmes Covered in This Document
B.E. Computer Science
B.E. Electronics & Electrical Engineering
M.Sc. Economics
M.E. Data Science
MBA in Business Analytics
4. General Admissions Operational Principles
5. Programme Knowledge Sections
1. Application submission
2. Profile screening
3. Entrance score validation
4. Interview scheduling
5. Interview evaluation
6. Final merit generation
7. Offer release
6. Standard Deficiency Handling Rules
7. Queue and Appointment Handling
8. AI Chatbot Knowledge Guidelines
9. Audit and Compliance Requirements
10. Internal Escalation Matrix
11. End-of-Cycle Operational Closure
`;
    const names = extractStructuredOfferingsFromText(doc).map((o) => o.name);
    assert.deepEqual(names.sort(), [...REAL_PROGRAMMES].sort());
  });
});
