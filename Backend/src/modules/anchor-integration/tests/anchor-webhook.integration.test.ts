import { createHmac } from 'crypto';
import {
  AnchorDepositEvent,
  AnchorDepositEventRepository,
  AnchorSettlementQueue,
} from '../anchor-deposit.types';
import { AnchorDepositService, AnchorOutOfOrderError, AnchorWebhookPayloadError } from '../anchor-deposit.service';
import { AnchorSignatureService } from '../anchor-signature.service';

const NOW = new Date('2026-08-24T12:00:00.000Z').getTime();
const SECRET = 'test-anchor-secret';

function payload(sequence: number, eventId = `event-${sequence}`): string {
  return JSON.stringify({
    eventId,
    depositId: 'deposit-1',
    eventType: 'deposit.initiated',
    status: sequence === 1 ? 'initiated' : 'ngn_received',
    sequence,
    occurredAt: new Date(NOW - 1000).toISOString(),
  });
}

function signature(body: string, timestamp: string): string {
  return createHmac('sha256', SECRET).update(`${timestamp}.${body}`).digest('hex');
}

class FakeRepository implements AnchorDepositEventRepository {
  events: AnchorDepositEvent[] = [];

  async persistEvent(event: AnchorDepositEvent): Promise<'created' | 'duplicate' | 'out_of_order'> {
    if (this.events.some((existing) => existing.eventId === event.eventId)) return 'duplicate';
    const latest = this.events.find((existing) => existing.depositId === event.depositId);
    if (latest && event.sequence <= latest.sequence) return 'out_of_order';
    this.events.push(event);
    return 'created';
  }
}

class FakeQueue implements AnchorSettlementQueue {
  events: AnchorDepositEvent[] = [];
  async enqueue(event: AnchorDepositEvent): Promise<void> { this.events.push(event); }
}

function createService(repository = new FakeRepository(), queue = new FakeQueue()): [AnchorDepositService, FakeRepository, FakeQueue] {
  const service = new AnchorDepositService(
    new AnchorSignatureService({ secret: SECRET, maxAgeMs: 300_000, maxFutureMs: 60_000 }),
    repository,
    queue,
    () => NOW,
  );
  return [service, repository, queue];
}

describe('anchor deposit webhook ingestion', () => {
  it('accepts a valid signature and queues settlement work', async () => {
    const [service, , queue] = createService();
    const body = payload(1);
    const timestamp = new Date(NOW).toISOString();

    await expect(service.ingest(body, signature(body, timestamp), timestamp)).resolves.toEqual({
      kind: 'accepted', acknowledgment: 'accepted',
    });
    expect(queue.events).toHaveLength(1);
  });

  it('rejects invalid signatures without persisting or queueing', async () => {
    const [service, repository, queue] = createService();
    const body = payload(1);
    const timestamp = new Date(NOW).toISOString();

    await expect(service.ingest(body, 'bad-signature', timestamp)).rejects.toThrow('Invalid webhook signature');
    expect(repository.events).toHaveLength(0);
    expect(queue.events).toHaveLength(0);
  });

  it('rejects replayed timestamps', async () => {
    const [service] = createService();
    const body = payload(1);
    const timestamp = new Date(NOW - 300_001).toISOString();

    await expect(service.ingest(body, signature(body, timestamp), timestamp)).rejects.toThrow('Invalid webhook timestamp');
  });

  it('acknowledges duplicate events without queueing twice', async () => {
    const [service, , queue] = createService();
    const body = payload(1);
    const timestamp = new Date(NOW).toISOString();
    const signed = signature(body, timestamp);

    await service.ingest(body, signed, timestamp);
    await expect(service.ingest(body, signed, timestamp)).resolves.toEqual({
      kind: 'duplicate', acknowledgment: 'duplicate',
    });
    expect(queue.events).toHaveLength(1);
  });

  it('rejects out-of-order events after a newer sequence was accepted', async () => {
    const [service] = createService();
    const newer = payload(2);
    const older = payload(1, 'event-older');
    const timestamp = new Date(NOW).toISOString();

    await service.ingest(newer, signature(newer, timestamp), timestamp);
    await expect(service.ingest(older, signature(older, timestamp), timestamp)).rejects.toBeInstanceOf(AnchorOutOfOrderError);
  });

  it('rejects malformed payloads only after signature verification', async () => {
    const [service] = createService();
    const body = JSON.stringify({ eventId: 'x' });
    const timestamp = new Date(NOW).toISOString();

    await expect(service.ingest(body, signature(body, timestamp), timestamp)).rejects.toBeInstanceOf(AnchorWebhookPayloadError);
  });
});