/**
 * Streak Events Module
 *
 * Listens for domain events (e.g. deposit confirmed) and forwards them
 * to the StreakService so the user's streak is updated in real time.
 * This keeps the service and the event-listener wiring separate so
 * either can be tested independently.
 */

import { DepositConfirmedEvent } from './streak.types';
import { StreakService } from './streak.service';

export interface StreakEventHandlerDeps {
  service: StreakService;
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
}

/**
 * Handles a deposit-confirmed event. Only confirmed deposits (with
 * on-chain reconciliation) extend a streak. Pending or failed deposits
 * are ignored.
 */
export async function handleDepositConfirmed(
  deps: StreakEventHandlerDeps,
  event: DepositConfirmedEvent
): Promise<void> {
  const logger = deps.logger ?? console;

  try {
    await deps.service.recordDeposit(event);
    logger.info(`[streaks] Recorded qualifying deposit ${event.depositId} for user ${event.userId}`);
  } catch (error) {
    logger.error(`[streaks] Failed to record deposit ${event.depositId} for user ${event.userId}`, error);
  }
}
