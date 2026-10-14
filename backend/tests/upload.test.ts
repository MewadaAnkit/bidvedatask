import request from 'supertest';
import { createApp } from '../src/app';
import { createTestToken, testUsers } from './setup';

const app = createApp();
const buyerToken = createTestToken(testUsers.buyer1);

describe('File Upload Security & Validation (Test #10)', () => {
  const testRfqId = 'b0000000-0000-0000-0000-000000000001';


  it('rejects upload with forbidden extension (.exe, .txt)', async () => {
    const res = await request(app)
      .post(`/api/rfqs/${testRfqId}/attachments`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .attach('file', Buffer.from('malicious executable code'), 'payload.exe');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_EXTENSION');
  });

  it('rejects upload with fake extension (magic byte mismatch: .pdf with plain text)', async () => {
    const fakePdfBuffer = Buffer.from('This is not a real PDF file header');
    const res = await request(app)
      .post(`/api/rfqs/${testRfqId}/attachments`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .attach('file', fakePdfBuffer, 'fake.pdf');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FAKE_EXTENSION');
  });

  it('rejects oversized file exceeding 10MB limit', async () => {
    // 10.5 MB buffer
    const oversizedBuffer = Buffer.alloc(10.5 * 1024 * 1024);
    const res = await request(app)
      .post(`/api/rfqs/${testRfqId}/attachments`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .attach('file', oversizedBuffer, 'oversized.pdf');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });
});
