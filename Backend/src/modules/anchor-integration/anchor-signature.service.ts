import { createHmac, timingSafeEqual } from 'crypto';
import { validateWebhookTimestamp, ReplayWindowConfig, WebhookReplayValidationError } from './webhook-replay-window';

export class AnchorSignatureValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnchorSignatureValidationError';
  }
}

export interface AnchorSignatureServiceConfig extends ReplayWindowConfig {
  secret: string;
}

export class AnchorSignatureService {
  constructor(private readonly config: AnchorSignatureServiceConfig) {
    if (!config.secret) throw new Error('Anchor webhook secret is not configured');
  }

  verify(rawBody: string, signature: string | undefined, timestamp: string | undefined, now = Date.now()): void {
    if (!signature || !timestamp) throw new AnchorSignatureValidationError('Missing webhook signature');
    try {
      validateWebhookTimestamp(timestamp, this.config, now);
    } catch (error) {
      if (error instanceof WebhookReplayValidationError) {
        throw new AnchorSignatureValidationError('Invalid webhook timestamp');
      }
      throw error;
    }
    const expected = createHmac('sha256', this.config.secret).update(`${timestamp}.${rawBody}`).digest('hex');
    const actual = signature.replace(/^sha256=/, '');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const actualBuffer = Buffer.from(actual, 'utf8');
    if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
      throw new AnchorSignatureValidationError('Invalid webhook signature');
    }
  }
}

export function createAnchorSignatureServiceFromEnv(): AnchorSignatureService {
  const secret = process.env.ANCHOR_WEBHOOK_SECRET;
  if (!secret) throw new Error('ANCHOR_WEBHOOK_SECRET is not configured');
  return new AnchorSignatureService({
    secret,
    maxAgeMs: Number(process.env.ANCHOR_WEBHOOK_MAX_AGE_MS ?? 300_000),
    maxFutureMs: Number(process.env.ANCHOR_WEBHOOK_MAX_FUTURE_MS ?? 60_000),
  });
}