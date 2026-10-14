import { z } from 'zod';
import { RfqStatus } from '@prisma/client';

export const rfqLineItemSchema = z.object({
  name: z.string().min(1, 'Line item name is required').max(200),
  quantity: z
    .number({ invalid_type_error: 'Quantity must be a positive number' })
    .positive('Quantity must be greater than zero'),
  unit: z.string().min(1, 'Unit of measure is required').max(50),
});

export const createRfqSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  category: z.string().min(2, 'Category is required').max(100),
  deliveryLocation: z.string().min(2, 'Delivery location is required').max(200),
  budget: z
    .number({ invalid_type_error: 'Budget must be a positive number' })
    .positive('Budget must be positive')
    .optional()
    .nullable(),
  deadline: z
    .string()
    .datetime({ message: 'Deadline must be a valid ISO datetime' })
    .refine((val) => new Date(val) > new Date(), {
      message: 'Deadline must be in the future',
    }),
  lineItems: z
    .array(rfqLineItemSchema)
    .min(1, 'RFQ must contain at least one line item'),
});

export const updateRfqSchema = createRfqSchema;

export const rfqQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  deliveryLocation: z.string().optional(),
  status: z.nativeEnum(RfqStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['createdAt', 'deadline', 'budget', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateRfqInput = z.infer<typeof createRfqSchema>;
export type UpdateRfqInput = z.infer<typeof updateRfqSchema>;
export type RfqQueryParams = z.infer<typeof rfqQuerySchema>;
