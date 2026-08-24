import { AnchorDepositEvent, AnchorDepositEventRepository, AnchorSettlementQueue, AnchorWebhookResult } from './anchor-deposit.types';
import { validateAnchorDepositPayload } from './anchor-webhook.validator';
import { AnchorSignatureService } from './anchor-signature.service';

export class AnchorWebhookPayloadError extends Error {
  constructor(message: string) { super(message); this.name = 'AnchorWebhookPayloadError'; }
}

export class AnchorOutOfOrderError extends Error {
  constructor() { super('Out-of-order anchor event'); this.name = 'AnchorOutOfOrderError'; }
}

export class AnchorDepositService {
  constructor(
    private readonly signatures: AnchorSignatureService,
    private readonly repository: AnchorDepositEventRepository,
    private readonly queue: AnchorSettlementQueue,
    private readonly now: () => number = Date.now,
  ) {}

  async ingest(rawBody: string, signature: string | undefined, timestamp: string | undefined): Promise<AnchorWebhookResult> {
    this.signatures.verify(rawBody, signature, timestamp, this.now());
    let payload;
    try { payload = validateAnchorDepositPayload(JSON.parse(rawBody)); } catch { throw new AnchorWebhookPayloadError('Invalid webhook payload'); }

    const event: AnchorDepositEvent = {
      eventId: payload.eventId,
      idempotencyKey: payload.eventId,
      depositId: payload.depositId,
      status: payload.status,
      sequence: payload.sequence,
      occurredAt: new Date(payload.occurredAt),
      payload,
    };
    const result = await this.repository.persistEvent(event);
    if (result === 'duplicate') return { kind: 'duplicate', acknowledgment: 'duplicate' };
    if (result === 'out_of_order') throw new AnchorOutOfOrderError();
    await this.queue.enqueue(event);
    return { kind: 'accepted', acknowledgment: 'accepted' };
  }
}