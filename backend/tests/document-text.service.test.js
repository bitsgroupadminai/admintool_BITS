import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.MONGODB_URI ||= 'mongodb://127.0.0.1/test';
process.env.REDIS_URL ||= 'redis://127.0.0.1:6379';
process.env.SESSION_SECRET ||= 'test-session-secret-16';
process.env.ADMIN_CLIENT_URL ||= 'http://localhost:5173';
process.env.STUDENT_CLIENT_URL ||= 'http://localhost:5174';

const { prepareDocumentForVerification } = await import('../src/shared/services/document-text.service.js');

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

test('prepareDocumentForVerification treats a PNG as an image even with a generic mime type', async () => {
  const filePath = path.join(os.tmpdir(), `marksheet-${Date.now()}.bin`);
  fs.writeFileSync(filePath, PNG_1X1);
  try {
    const prep = await prepareDocumentForVerification(filePath, 'application/octet-stream');
    assert.equal(prep.kind, 'image');
    assert.match(prep.dataUrl, /^data:image\/png;base64,/);
  } finally {
    fs.unlinkSync(filePath);
  }
});
