import { Queue } from 'bullmq';
import { AnchorDepositEvent, AnchorSettlementQueue } from '../modules/anchor-integration/anchor-deposit.types';

export const ANCHOR_SETTLEMENT_QUEUE_NAME = 'anchor-settlement';

export class BullMqAnchorSettlementQueue implements AnchorSettlementQueue {
  constructor(private readonly queue: Pick<Queue, 'add'>) {}

  async enqueue(event: AnchorDepositEvent): Promise<void> {
    await this.queue.add('process', event, { jobId: event.idempotencyKey });
  }
}