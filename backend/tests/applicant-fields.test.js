import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_APPLICANT_AGE_ERROR,
  ageFromIsoDate,
  getDateOfBirthAgeError,
  validateApplicantDetails,
} from '../src/shared/helpers/applicantFields.helper.js';

const dobField = {
  fieldKey: 'date_of_birth',
  label: 'Date of birth',
  fieldType: 'date',
  required: true,
};

const now = new Date('2026-08-30T12:00:00');

describe('applicant date of birth age', () => {
  it('treats the birthday as the day the applicant turns that age', () => {
    assert.equal(ageFromIsoDate('2011-08-30', now), 15);
    assert.equal(ageFromIsoDate('2011-08-31', now), 14);
    assert.equal(ageFromIsoDate('2026-08-16', now), 0);
  });

  it('rejects applicants younger than 15', () => {
    assert.equal(getDateOfBirthAgeError(dobField, '2011-08-31', now), MIN_APPLICANT_AGE_ERROR);
    assert.equal(getDateOfBirthAgeError(dobField, '2026-08-16', now), MIN_APPLICANT_AGE_ERROR);
    assert.equal(getDateOfBirthAgeError(dobField, '2011-08-30', now), null);
  });

  it('does not apply the age rule to other date fields', () => {
    const otherDate = {
      fieldKey: 'programme_start',
      label: 'Preferred start date',
      fieldType: 'date',
      required: true,
    };
    assert.equal(getDateOfBirthAgeError(otherDate, '2026-08-16', now), null);
  });

  it('blocks application submit when date of birth is under 15', () => {
    const year = new Date().getFullYear();
    const tooYoung = validateApplicantDetails([dobField], {
      date_of_birth: `${year - 14}-01-01`,
    });
    assert.deepEqual(tooYoung.errors, [MIN_APPLICANT_AGE_ERROR]);
    assert.equal(tooYoung.details.length, 0);

    const eligible = validateApplicantDetails([dobField], {
      date_of_birth: `${year - 16}-01-01`,
    });
    assert.deepEqual(eligible.errors, []);
    assert.equal(eligible.details[0]?.value, `${year - 16}-01-01`);
  });
});
