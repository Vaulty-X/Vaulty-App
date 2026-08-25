import { PrismaClient } from '@prisma/client';
import { AnchorDepositEvent, AnchorDepositEventRepository } from './anchor-deposit.types';

export class PrismaAnchorDepositEventRepository implements AnchorDepositEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async persistEvent(event: AnchorDepositEvent): Promise<'created' | 'duplicate' | 'out_of_order'> {
    const rows = await this.prisma.$queryRaw<Array<{ result: string }>>`
      SELECT record_anchor_deposit_event(
        ${event.eventId}, ${event.idempotencyKey}, ${event.depositId},
        ${event.status}, ${event.sequence}, ${event.occurredAt}, ${JSON.stringify(event.payload)}::jsonb
      ) AS result
    `;
    const result = rows[0]?.result;
    if (result === 'created' || result === 'duplicate' || result === 'out_of_order') return result;
    throw new Error('Invalid anchor event persistence result');
  }
}