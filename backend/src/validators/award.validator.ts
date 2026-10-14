import { z } from 'zod';

export const awardRfqSchema = z.object({
  quoteId: z.string().uuid('Invalid quote ID format'),
  reason: z.string().max(1000).optional(),
});

export const comparisonQuerySchema = z.object({
  sortBy: z.enum(['totalAmount', 'deliveryDays']).default('totalAmount'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type AwardRfqInput = z.infer<typeof awardRfqSchema>;
export type ComparisonQueryParams = z.infer<typeof comparisonQuerySchema>;
