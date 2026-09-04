function isNegativeFinding(finding) {
  const verdict = finding.eligibilityVerdict || finding.verdict;
  return (
    verdict === 'fail' ||
    verdict === 'uncertain' ||
    verdict === 'ineligible' ||
    Boolean(finding.issue)
  );
}

function itemsFromAiDecisions(decisions = []) {
  const items = [];
  const documentDecision = decisions.find((decision) => decision.handler === 'document_verification');

  for (const finding of documentDecision?.perDocument ?? []) {
    if (!isNegativeFinding(finding)) continue;
    const eligibilityIssue = (finding.eligibilityResult?.results ?? []).find(
      (result) => result.status === 'failed' || result.status === 'unchecked',
    );
    items.push({
      title: finding.requirementName || 'Document',
      detail:
        finding.issue ||
        eligibilityIssue?.message ||
        (finding.observedContent ? `What was uploaded: ${finding.observedContent}` : 'This document is ineligible.'),
    });
    for (const result of finding.eligibilityResult?.results ?? []) {
      if (result.status !== 'failed' && result.status !== 'unchecked') continue;
      if (result.message && result.message !== eligibilityIssue?.message) {
        items.push({
          title: finding.requirementName || result.field || 'Eligibility',
          detail: result.message,
        });
      }
    }
  }

  return items.filter((item) => item.title || item.detail);
}

function splitCorrectionNote(note) {
  const trimmed = String(note ?? '').trim();
  if (!trimmed) return [];
  if (trimmed.includes('\n')) {
    return trimmed
      .split(/\n+/)
      .map((line) => line.replace(/^[-*•]\s+/, '').trim())
      .filter(Boolean);
  }

  return trimmed
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function itemsFromNote(note) {
  return splitCorrectionNote(note).map((text) => {
    const labeled = text.match(/^([^:]{2,80}):\s+(.+)$/);
    if (labeled) {
      return { title: labeled[1].trim(), detail: labeled[2].trim() };
    }
    const uploadMatch = text.match(
      /^Upload (?:the actual |the official |a clear (?:image of (?:the applicant's )?|passport-size )?|an? |the )?(.+?) instead of/i,
    );
    if (uploadMatch) {
      return { title: uploadMatch[1].trim(), detail: text };
    }
    return { title: '', detail: text };
  });
}

/**
 * Structured correction items for student-facing AI / staff feedback.
 * Prefers per-document AI findings, then falls back to splitting the stored note.
 */
export function getCorrectionFeedbackItems({
  correctionNote = '',
  correctionRequiredDocuments = [],
  aiDecisions = [],
} = {}) {
  const fromAi = itemsFromAiDecisions(aiDecisions);
  if (fromAi.length) return fromAi;

  const fromNote = itemsFromNote(correctionNote);
  if (fromNote.length) return fromNote;

  return (correctionRequiredDocuments ?? []).map((name) => ({
    title: name,
    detail: 'Please replace this file and resubmit.',
  }));
}
