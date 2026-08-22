/**
 * Recalculate Discipline Scores Job
 *
 * Batch-recalculates every user's discipline score. Relies on
 * `DisciplineScoreService.recalculateForUser`, which only persists a new
 * snapshot when the result actually changed — so running this job
 * repeatedly (e.g. daily) never creates noisy, duplicate snapshots for
 * users whose behavior hasn't changed.
 *
 * This is a plain async function rather than a wired-up BullMQ worker,
 * since no queue/scheduler configuration exists yet in this repo. To
 * schedule it with BullMQ once that infra lands:
 *
 *   import { Worker } from 'bullmq';
 *   new Worker('discipline-score-recalculation', async () => {
 *     await runDisciplineScoreRecalculationJob({ service, listUserIds });
 *   }, { connection });
 *
 * Each user is processed independently and a failure for one user is
 * logged and skipped rather than aborting the whole run.
 */

import { DisciplineScoreService } from '../../modules/discipline-score/discipline-score.service';

export interface RecalculateDisciplineScoresJobDeps {
  service: DisciplineScoreService;
  /** Returns the ids of every user who should be recalculated in this run. */
  listUserIds: () => Promise<string[]>;
  logger?: Pick<Console, 'info' | 'warn' | 'error'>;
}

export interface RecalculateDisciplineScoresJobSummary {
  processed: number;
  updated: number;
  unchanged: number;
  failed: number;
}

export async function runDisciplineScoreRecalculationJob(
  deps: RecalculateDisciplineScoresJobDeps
): Promise<RecalculateDisciplineScoresJobSummary> {
  const logger = deps.logger ?? console;
  const userIds = await deps.listUserIds();

  const summary: RecalculateDisciplineScoresJobSummary = {
    processed: 0,
    updated: 0,
    unchanged: 0,
    failed: 0,
  };

  for (const userId of userIds) {
    summary.processed += 1;

    try {
      const { created } = await deps.service.recalculateForUser(userId);
      if (created) {
        summary.updated += 1;
      } else {
        summary.unchanged += 1;
      }
    } catch (error) {
      summary.failed += 1;
      logger.error(`[discipline-score] Failed to recalculate score for user ${userId}`, error);
    }
  }

  logger.info(
    '[discipline-score] Recalculation complete: ' +
      `processed=${summary.processed} updated=${summary.updated} ` +
      `unchanged=${summary.unchanged} failed=${summary.failed}`
  );

  return summary;
}
