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

  if (looksLikeWrongFile(finding) || finding.verdict === 'fail') {
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

  if (finding.verdict === 'uncertain') {
    errors.push({
      label: 'Problem',
      text: issue || `AI could not confirm this ${expected}.`,
    });
    if (found) {
      errors.push({
        label: 'Uploaded instead',
        text: found,
      });
    }
    return errors;
  }

  if (issue) {
    errors.push({ label: 'Details', text: issue });
  }

  return errors;
}

export function getDocumentAiStatus(finding) {
  if (!finding) return null;
  if (finding.verdict === 'pass') {
    return { label: 'Passed', tone: 'pass' };
  }
  if (finding.verdict === 'fail') {
    return { label: 'Failed', tone: 'fail' };
  }
  if (finding.verdict === 'uncertain') {
    return { label: 'Needs a closer look', tone: 'uncertain' };
  }
  return { label: 'Checked', tone: 'uncertain' };
}

export function hasDocumentAiFailures(application) {
  const decision = (application?.aiDecisions ?? []).find(
    (item) => item.handler === 'document_verification',
  );
  return (decision?.perDocument ?? []).some(
    (finding) => finding.verdict === 'fail' || finding.verdict === 'uncertain',
  );
}
