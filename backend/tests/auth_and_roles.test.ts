import request from 'supertest';
import { createApp } from '../src/app';
import { createTestToken, testUsers } from './setup';

const app = createApp();
const buyerToken = createTestToken(testUsers.buyer1);
const vendorToken = createTestToken(testUsers.vendor1);

describe('Role-Based Access Control & Auth Boundaries (Test #5)', () => {
  it('rejects unauthenticated requests to protected endpoints with 401', async () => {
    const res = await request(app).get('/api/rfqs');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects Vendor attempting to create an RFQ with 403 (Test #5)', async () => {
    const res = await request(app)
      .post('/api/rfqs')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({
        title: 'Vendor Attempting RFQ Creation',
        description: 'Should be rejected by role middleware',
        category: 'Machinery',
        deliveryLocation: 'Mumbai',
        deadline: new Date(Date.now() + 86400000).toISOString(),
        lineItems: [{ name: 'Item 1', quantity: 10, unit: 'PCS' }],
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects Buyer attempting to submit a quote with 403 (Test #5)', async () => {
    const res = await request(app)
      .post('/api/rfqs/00000000-0000-0000-0000-000000000001/quotes')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        deliveryDays: 5,
        prices: [
          {
            rfqLineItemId: '00000000-0000-0000-0000-000000000002',
            unitPrice: 100,
          },
        ],
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects public signup with ADMIN role (privilege escalation prevention)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Hacker',
        email: 'hacker@exploit.com',
        password: 'Password123!',
        role: 'ADMIN',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
