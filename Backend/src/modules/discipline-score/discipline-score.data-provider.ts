/**
 * Discipline Score Data Provider
 *
 * Reads confirmed ledger data (deposits, streaks, vault/goal progress,
 * confirmed loan repayments) and assembles it into `DisciplineScoreInputs`
 * for the calculator.
 *
 * This repo does not yet have persistence-layer modules for deposits,
 * vaults, or loan repayments (only isolated validators exist today under
 * `src/modules/vaults` and `src/modules/streaks`), so `PrismaDisciplineScoreDataProvider`
 * below is a reference implementation: it shows the intended shape and
 * query scoping (always by `userId`, always confirmed/ledger-settled
 * records only) but its table/column names should be adapted once those
 * modules' actual schemas land. `DisciplineScoreService` depends only on
 * the `DisciplineScoreDataProvider` interface, so swapping this out never
 * requires touching the calculator, service, controller, or routes.
 */

import { PrismaClient } from '@prisma/client';
import {
  DisciplineScoreDataProvider,
  DisciplineScoreInputs,
  GoalProgressEntry,
} from './discipline-score.types';

/** Number of trailing days used to measure saving consistency. */
const CONSISTENCY_WINDOW_DAYS = 90;
/** Consistency is measured in weekly periods within the window above. */
const CONSISTENCY_PERIOD_DAYS = 7;

interface ConsistencyRow {
  active_periods: number;
}

interface StreakRow {
  current_streak_days: number;
}

interface GoalRow {
  target_amount: number;
  current_amount: number;
}

interface RepaymentRow {
  confirmed_repayments: number;
  on_time_repayments: number;
}

export class PrismaDisciplineScoreDataProvider implements DisciplineScoreDataProvider {
  constructor(private readonly prisma: PrismaClient) {}

  async getInputsForUser(userId: string): Promise<DisciplineScoreInputs> {
    const [consistency, streak, goals, repayment] = await Promise.all([
      this.getSavingConsistency(userId),
      this.getStreak(userId),
      this.getGoalProgress(userId),
      this.getRepaymentHistory(userId),
    ]);

    return {
      savingConsistency: consistency,
      streak,
      goalProgress: goals.length > 0 ? { goals } : null,
      repaymentHistory: repayment,
    };
  }

  private async getSavingConsistency(userId: string) {
    const expectedPeriods = Math.floor(CONSISTENCY_WINDOW_DAYS / CONSISTENCY_PERIOD_DAYS);

    const rows = await this.prisma.$queryRaw<ConsistencyRow[]>`
      SELECT COUNT(DISTINCT date_trunc('week', created_at)) AS active_periods
      FROM transactions
      WHERE user_id = ${userId}
        AND type = 'DEPOSIT'
        AND status = 'CONFIRMED'
        AND created_at >= NOW() - (${CONSISTENCY_WINDOW_DAYS}::text || ' days')::interval
    `;

    const activePeriods = Number(rows[0]?.active_periods ?? 0);
    return { expectedPeriods, activePeriods };
  }

  private async getStreak(userId: string) {
    const rows = await this.prisma.$queryRaw<StreakRow[]>`
      SELECT current_streak_days
      FROM user_streaks
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    return { currentStreakDays: Number(rows[0]?.current_streak_days ?? 0) };
  }

  private async getGoalProgress(userId: string): Promise<GoalProgressEntry[]> {
    const rows = await this.prisma.$queryRaw<GoalRow[]>`
      SELECT target_amount, current_amount
      FROM vaults
      WHERE user_id = ${userId}
        AND status = 'ACTIVE'
        AND target_amount IS NOT NULL
    `;

    return rows.map((row: GoalRow) => ({
      targetAmount: Number(row.target_amount),
      currentAmount: Number(row.current_amount),
    }));
  }

  private async getRepaymentHistory(userId: string) {
    const rows = await this.prisma.$queryRaw<RepaymentRow[]>`
      SELECT
        COUNT(*) FILTER (WHERE status = 'CONFIRMED') AS confirmed_repayments,
        COUNT(*) FILTER (WHERE status = 'CONFIRMED' AND paid_at <= due_at) AS on_time_repayments
      FROM loan_repayments
      WHERE user_id = ${userId}
    `;

    const confirmedRepayments = Number(rows[0]?.confirmed_repayments ?? 0);
    const onTimeRepayments = Number(rows[0]?.on_time_repayments ?? 0);

    return confirmedRepayments > 0
      ? { confirmedRepayments, onTimeRepayments }
      : null;
  }
}
