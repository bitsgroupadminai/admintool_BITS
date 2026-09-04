import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

const {
  getDocumentUploadProgress,
  getMissingRequiredDocuments,
} = await import('../src/shared/helpers/applicationDocument.helper.js');

describe('application document progress', () => {
  it('does not throw when an uploaded document has no requirementId', () => {
    const offering = {
      documentRequirements: [
        { _id: 'req-1', name: 'Photo', required: true },
        { _id: 'req-2', name: 'ID Proof', required: true },
      ],
    };
    const application = {
      documents: [
        {
          _id: 'doc-1',
          requirementId: null,
          requirementName: 'Photo',
          originalName: 'photo.pdf',
        },
      ],
    };

    const progress = getDocumentUploadProgress(offering, application);
    assert.equal(progress.requiredDocumentCount, 2);
    assert.equal(progress.uploadedRequiredCount, 1);
    assert.equal(progress.documentsComplete, false);
    assert.deepEqual(
      progress.missingRequiredDocuments.map((item) => item.name),
      ['ID Proof'],
    );
    assert.equal(progress.documents[0].requirementId, '');
  });

  it('treats name matches as uploaded when IDs are missing', () => {
    const offering = {
      documentRequirements: [{ name: 'Transcript', required: true }],
    };
    const application = {
      documents: [{ requirementName: 'transcript', originalName: 'marks.pdf' }],
    };

    const missing = getMissingRequiredDocuments(offering, application);
    assert.equal(missing.length, 0);
    const progress = getDocumentUploadProgress(offering, application);
    assert.equal(progress.documentsComplete, true);
  });
});
