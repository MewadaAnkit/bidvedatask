import { z } from 'zod';

export const quotePriceItemSchema = z.object({
  rfqLineItemId: z.string().uuid('Invalid line item ID format'),
  unitPrice: z
    .number({ invalid_type_error: 'Unit price must be a number' })
    .positive('Unit price must be greater than zero'),
});

export const submitQuoteSchema = z.object({
  deliveryDays: z
    .number({ invalid_type_error: 'Delivery days must be an integer' })
    .int('Delivery days must be a whole number')
    .positive('Delivery days must be at least 1 day'),
  notes: z.string().max(2000).optional().nullable(),
  prices: z
    .array(quotePriceItemSchema)
    .min(1, 'Quote must include pricing for line items'),
});

export const reviseQuoteSchema = submitQuoteSchema;

export type SubmitQuoteInput = z.infer<typeof submitQuoteSchema>;
export type ReviseQuoteInput = z.infer<typeof reviseQuoteSchema>;
