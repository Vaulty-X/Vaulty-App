import { AnchorDepositEvent } from '../../modules/anchor-integration/anchor-deposit.types';

export interface AnchorSettlementProcessor {
  process(event: AnchorDepositEvent): Promise<void>;
}

export async function processAnchorSettlement(
  event: AnchorDepositEvent,
  processor: AnchorSettlementProcessor,
): Promise<void> {
  await processor.process(event);
}