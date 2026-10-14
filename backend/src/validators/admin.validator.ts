import { z } from 'zod';
import { Role } from '@prisma/client';

export const adminCreateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').max(100),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(6, 'Password must be at least 6 characters long').max(100),
  role: z.nativeEnum(Role, {
    errorMap: () => ({ message: 'Role must be one of: BUYER, VENDOR, ADMIN' }),
  }),
});

export const adminUpdateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').max(100).optional(),
  email: z.string().email('Invalid email address').toLowerCase().trim().optional(),
  role: z.nativeEnum(Role).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters long').max(100).optional(),
});

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
