import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-replace-with-secure-key-in-prod';

export function createTestToken(payload: { id: string; email: string; role: Role; name: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

export const testUsers = {
  admin: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@bidveda.com',
    role: Role.ADMIN,
    name: 'Admin User',
  },
  buyer1: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'buyer1@company.com',
    role: Role.BUYER,
    name: 'Acme Buyer',
  },
  buyer2: {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'buyer2@company.com',
    role: Role.BUYER,
    name: 'Apex Buyer',
  },
  vendor1: {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'vendor1@tech.com',
    role: Role.VENDOR,
    name: 'Precision Vendor',
  },
  vendor2: {
    id: '00000000-0000-0000-0000-000000000005',
    email: 'vendor2@build.com',
    role: Role.VENDOR,
    name: 'Global Vendor',
  },
};
