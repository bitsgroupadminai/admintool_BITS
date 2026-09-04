function looksLikeWrongFile(finding) {
  if (finding.matchesRequirement === false) return true;
  return /which is not a |instead of |wrong (file|document|type)/i.test(finding.issue ?? '');
}

function looksLikeIdentityMismatch(finding) {
  if (finding.belongsToApplicant === false) return true;
  return /belong|not \[?the applicant|does not match .*name|different person/i.test(
    finding.issue ?? '',
  );
}

/**
 * Turn a raw AI per-document finding into labeled rows for one requirement.
 */
export function getDocumentAiErrors(finding, requirementName) {
  if (!finding) return [];

  const expected = requirementName || 'this document';
  const found = String(finding.observedContent ?? '').trim();
  const issue = String(finding.issue ?? '').trim();
  const errors = [];

  if (looksLikeIdentityMismatch(finding)) {
    errors.push({
      label: 'Problem',
      text: issue || `This ${expected} does not match your name or details.`,
    });
    errors.push({
      label: 'What to do',
      text: `Upload your own ${expected}.`,
    });
    return errors;
  }

  if (finding.legible === false) {
    errors.push({
      label: 'Problem',
      text: issue || `This ${expected} is too unclear to read.`,
    });
    errors.push({
      label: 'What to do',
      text: `Upload a clearer photo or scan of your ${expected}.`,
    });
    return errors;
  }

  if (looksLikeWrongFile(finding) || finding.authenticityVerdict === 'fail') {
    errors.push({
      label: 'Problem',
      text: `Wrong file for “${expected}”.`,
    });
    if (found) {
      errors.push({
        label: 'Uploaded instead',
        text: found,
      });
    } else if (issue) {
      errors.push({
        label: 'Details',
        text: issue,
      });
    }
    errors.push({
      label: 'What to do',
      text: `Replace this file with a ${expected}.`,
    });
    return errors;
  }

  const eligibilityFails = (finding.eligibilityResult?.results ?? []).filter(
    (result) => result.status === 'failed' || result.status === 'unchecked',
  );
  if (eligibilityFails.length) {
    return eligibilityFails.map((result) => ({
      label: result.field || 'Eligibility',
      text: result.message || `This ${expected} does not meet the eligibility requirement.`,
    }));
  }

  const verdict = finding.eligibilityVerdict || finding.verdict;
  if (verdict === 'ineligible' || verdict === 'fail' || verdict === 'uncertain') {
    errors.push({
      label: 'Problem',
      text: issue || `This ${expected} is ineligible.`,
    });
    return errors;
  }

  if (issue) {
    errors.push({ label: 'Details', text: issue });
  }

  return errors;
}

export function getDocumentAiStatus(finding) {
  if (!finding) return null;
  const verdict = finding.eligibilityVerdict || finding.verdict;
  if (verdict === 'eligible' || verdict === 'pass') {
    return { label: 'Eligible', tone: 'pass' };
  }
  if (verdict === 'ineligible' || verdict === 'fail') {
    return { label: 'Ineligible', tone: 'fail' };
  }
  if (verdict === 'uncertain') {
    return { label: 'Ineligible', tone: 'fail' };
  }
  return { label: 'Checked', tone: 'uncertain' };
}

export function hasDocumentAiFailures(application) {
  const decision = (application?.aiDecisions ?? []).find(
    (item) => item.handler === 'document_verification',
  );
  return (decision?.perDocument ?? []).some((finding) => {
    const verdict = finding.eligibilityVerdict || finding.verdict;
    return verdict === 'fail' || verdict === 'uncertain' || verdict === 'ineligible';
  });
}
