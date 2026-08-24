import { z } from 'zod';
import { ANCHOR_DEPOSIT_EVENT_TYPES, validateAnchorEventType } from './anchor-event-type.validator';
import { AnchorDepositWebhookPayload } from './anchor-deposit.types';

const statusSchema = z.enum([
  'initiated',
  'ngn_received',
  'conversion',
  'stellar_settlement',
  'failed',
  'reversed',
]);

const payloadSchema = z.object({
  eventId: z.string().trim().min(1).max(200),
  depositId: z.string().trim().min(1).max(200),
  eventType: z.string().trim().refine((value) => validateAnchorEventType(value).valid, 'Unsupported event type'),
  status: statusSchema,
  sequence: z.number().int().nonnegative(),
  occurredAt: z.string().datetime({ offset: true }),
  amountNgn: z.string().optional(),
  amountUsdc: z.string().optional(),
  stellarAddress: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
}).strict();

export function validateAnchorDepositPayload(input: unknown): AnchorDepositWebhookPayload {
  return payloadSchema.parse(input) as AnchorDepositWebhookPayload;
}

export { ANCHOR_DEPOSIT_EVENT_TYPES };