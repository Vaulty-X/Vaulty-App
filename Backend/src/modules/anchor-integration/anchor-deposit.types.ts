import { AnchorDepositEventType } from './anchor-event-type.validator';

export type AnchorDepositStatus =
  | 'initiated'
  | 'ngn_received'
  | 'conversion'
  | 'stellar_settlement'
  | 'failed'
  | 'reversed';

export interface AnchorDepositWebhookPayload {
  eventId: string;
  depositId: string;
  eventType: AnchorDepositEventType;
  status: AnchorDepositStatus;
  sequence: number;
  occurredAt: string;
  amountNgn?: string;
  amountUsdc?: string;
  stellarAddress?: string;
  metadata?: Record<string, unknown>;
}

export interface AnchorDepositEvent {
  eventId: string;
  idempotencyKey: string;
  depositId: string;
  status: AnchorDepositStatus;
  sequence: number;
  occurredAt: Date;
  payload: AnchorDepositWebhookPayload;
}

export interface AnchorDepositEventRepository {
  persistEvent(event: AnchorDepositEvent): Promise<'created' | 'duplicate' | 'out_of_order'>;
}

export interface AnchorSettlementQueue {
  enqueue(event: AnchorDepositEvent): Promise<void>;
}

export interface AnchorWebhookResult {
  kind: 'accepted' | 'duplicate';
  acknowledgment: 'accepted' | 'duplicate';
}