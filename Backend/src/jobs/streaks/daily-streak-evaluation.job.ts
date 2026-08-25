/**
 * Daily Streak Evaluation Job
 *
 * Batch-evaluates every user's streak for the previous local calendar
 * day. The job is idempotent: re-running it for the same UTC date never
 * awards the same day twice, because the repository's `recordDailyActivity`
 * enforces a unique constraint on `deposit_id`, and the job only
 * transitions a user's streak state when the evaluation date is strictly
 * ahead of the last processed date.
 *
 * To wire this up with BullMQ once that infrastructure lands:
 *
 *   import { Worker } from 'bullmq';
 *   new Worker('streak-evaluation', async () => {
 *     await runDailyStreakEvaluationJob({ service, listUserIds });
 *   }, { connection });
 *
 * Each user is processed independently and a failure for one user is
 * logged and skipped rather than aborting the whole run.
 */

import { StreakService } from '../../modules/streaks/streak.service';

export interface DailyStreakEvaluationJobDeps {
  service: StreakService;
  /** Returns the ids of every user who should be evaluated in this run. */
  listUserIds: () => Promise<string[]>;
  /** The UTC date to evaluate. Defaults to yesterday in UTC. */
  evaluationUtcDate?: Date;
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
}

export interface DailyStreakEvaluationJobSummary {
  processed: number;
  updated: number;
  unchanged: number;
  freezeUsed: number;
  failed: number;
}

export async function runDailyStreakEvaluationJob(
  deps: DailyStreakEvaluationJobDeps
): Promise<DailyStreakEvaluationJobSummary> {
  const logger = deps.logger ?? console;
  const evaluationUtcDate = deps.evaluationUtcDate ?? addDays(new Date(), -1);

  const summary: DailyStreakEvaluationJobSummary = {
    processed: 0,
    updated: 0,
    unchanged: 0,
    freezeUsed: 0,
    failed: 0,
  };

  const userIds = await deps.listUserIds();

  for (const userId of userIds) {
    summary.processed += 1;

    try {
      const result = await deps.service.evaluateUserStreak(userId, evaluationUtcDate);
      if (result.streakUpdated) {
        summary.updated += 1;
      } else {
        summary.unchanged += 1;
      }
      if (result.freezeUsed) {
        summary.freezeUsed += 1;
      }
    } catch (error) {
      summary.failed += 1;
      logger.error(`[streaks] Daily evaluation failed for user ${userId}`, error);
    }
  }

  logger.info(
    '[streaks] Daily evaluation complete: ' +
      `processed=${summary.processed} updated=${summary.updated} ` +
      `unchanged=${summary.unchanged} freezeUsed=${summary.freezeUsed} ` +
      `failed=${summary.failed}`
  );

  return summary;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}
