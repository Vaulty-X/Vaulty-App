/**
 * Streak Service
 *
 * Business logic for savings streak tracking. The service owns the
 * streak-calculation rules, freeze application, and the hand-off between
 * real-time deposit events and the daily evaluation job. Neither the
 * controller nor the job touches the repository directly.
 *
 * Timezone policy (documented):
 *   - Each user's local timezone is stored in `users.timezone` (IANA ID).
 *   - A "day" is a calendar date in the user's local timezone.
 *   - The daily evaluation job runs at UTC midnight and evaluates the
 *     previous local calendar day for each user.
 *   - Only confirmed deposits (with on-chain reconciliation status) may
 *     extend a streak. Pending or failed deposits are ignored.
 */

import {
  DailyStreakEvaluationResult,
  DepositConfirmedEvent,
  FreezeStatusResponse,
  StreakDailyActivity,
  StreakDataProvider,
  StreakRepository,
  StreakResponse,
  UserStreakFreeze,
} from './streak.types';
import { getNextMilestone } from './streak-milestones';

export class StreakService {
  constructor(
    private readonly repository: StreakRepository,
    private readonly dataProvider: StreakDataProvider
  ) {}

  /**
   * Returns the authenticated user's current streak response.
   */
  async getStreakState(userId: string): Promise<StreakResponse> {
    const state = await this.repository.findStreakState(userId);
    const currentStreak = state?.currentStreak ?? 0;
    const nextMilestone = getNextMilestone(currentStreak);

    return {
      currentStreak,
      longestStreak: state?.longestStreak ?? 0,
      lastActivityDate: state?.lastActivityDate ?? null,
      nextMilestone: nextMilestone.milestone
        ? {
            days: nextMilestone.milestone.days,
            name: nextMilestone.milestone.name,
            description: nextMilestone.milestone.description,
            daysRemaining: nextMilestone.daysRemaining,
          }
        : null,
      isMaxed: nextMilestone.isMaxed,
    };
  }

  /**
   * Records a confirmed deposit as daily qualifying activity and updates
   * the user's streak in real time. Idempotent: the same depositId is
   * never counted twice.
   */
  async recordDeposit(event: DepositConfirmedEvent): Promise<StreakDailyActivity> {
    const timezone = await this.dataProvider.getUserTimezone(event.userId);
    const localDate = toLocalDate(event.confirmedAt, timezone);

    const activity = await this.repository.recordDailyActivity({
      userId: event.userId,
      activityDate: localDate,
      depositId: event.depositId,
    });

    await this.updateStreakForActivity(event.userId, localDate);

    return activity;
  }

  /**
   * Returns whether the user currently has an eligible freeze and the
   * freeze details if so.
   */
  async getFreezeStatus(userId: string): Promise<FreezeStatusResponse> {
    const freeze = await this.repository.findActiveFreeze(userId);

    if (!freeze) {
      return {
        hasEligibleFreeze: false,
        freeze: null,
      };
    }

    return {
      hasEligibleFreeze: true,
      freeze,
    };
  }

  /**
   * Requests a freeze for the user. The freeze is created in a pending
   * state and becomes eligible once approved. This method is for
   * user-initiated requests; admin approval is handled separately.
   */
  async requestFreeze(userId: string, durationDays: number): Promise<UserStreakFreeze> {
    const today = new Date();
    const localToday = toLocalDate(today, await this.dataProvider.getUserTimezone(userId));
    const startDate = localToday;
    const endDate = addDays(localToday, durationDays);

    return this.repository.createFreeze({
      userId,
      freezeStartDate: startDate,
      freezeEndDate: endDate,
      approvedAt: null,
    });
  }

  /**
   * Evaluates the previous local calendar day for a single user and
   * updates their streak. Called by the daily evaluation job.
   */
  async evaluateUserStreak(
    userId: string,
    evaluationUtcDate: Date
  ): Promise<DailyStreakEvaluationResult> {
    const timezone = await this.dataProvider.getUserTimezone(userId);
    const evaluationLocalDate = toLocalDate(evaluationUtcDate, timezone);
    const previousLocalDate = addDays(evaluationLocalDate, -1);

    const activities = await this.repository.findDailyActivities(userId, previousLocalDate, previousLocalDate);
    const hasActivity = activities.length > 0;

    let state = await this.repository.findStreakState(userId);
    if (!state) {
      state = {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        lastStreakDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    let streakUpdated = false;
    let freezeUsed = false;

    if (hasActivity) {
      if (state.lastStreakDate === null) {
        state.currentStreak = 1;
        state.longestStreak = 1;
        state.lastStreakDate = previousLocalDate;
        state.lastActivityDate = previousLocalDate;
        streakUpdated = true;
      } else if (state.lastStreakDate === previousLocalDate) {
        streakUpdated = false;
      } else {
        const gap = daysBetween(state.lastStreakDate, previousLocalDate);
        if (gap === 1) {
          state.currentStreak += 1;
          state.lastStreakDate = previousLocalDate;
          state.lastActivityDate = previousLocalDate;
          streakUpdated = true;
        } else if (gap > 1) {
          state.currentStreak = 1;
          state.lastStreakDate = previousLocalDate;
          state.lastActivityDate = previousLocalDate;
          streakUpdated = true;
        }
      }

      if (state.currentStreak > state.longestStreak) {
        state.longestStreak = state.currentStreak;
      }
    } else {
      if (state.lastStreakDate !== null && state.lastStreakDate !== previousLocalDate) {
        const freeze = await this.repository.findActiveFreeze(userId);
        if (freeze) {
          const updatedFreeze = await this.repository.markFreezeUsed(freeze.id, new Date());
          if (updatedFreeze) {
            state.lastStreakDate = previousLocalDate;
            state.lastActivityDate = previousLocalDate;
            freezeUsed = true;
            streakUpdated = true;
          }
        } else if (state.lastStreakDate !== previousLocalDate) {
          state.currentStreak = 0;
          state.lastActivityDate = previousLocalDate;
          streakUpdated = true;
        }
      }
    }

    if (streakUpdated) {
      state.updatedAt = new Date();
      await this.repository.upsertStreakState(state);
    }

    return {
      userId,
      streakUpdated,
      newCurrentStreak: state.currentStreak,
      freezeUsed,
    };
  }

  /**
   * Batch-evaluates all users for the given UTC date. Used by the
   * daily evaluation job.
   */
  async evaluateAllStreaks(
    evaluationUtcDate: Date,
    listUserIds: () => Promise<string[]>
  ): Promise<DailyStreakEvaluationResult[]> {
    const userIds = await listUserIds();
    const results: DailyStreakEvaluationResult[] = [];

    for (const userId of userIds) {
      try {
        const result = await this.evaluateUserStreak(userId, evaluationUtcDate);
        results.push(result);
      } catch (error) {
        results.push({
          userId,
          streakUpdated: false,
          newCurrentStreak: 0,
          freezeUsed: false,
        });
      }
    }

    return results;
  }

  private async updateStreakForActivity(userId: string, localDate: string): Promise<void> {
    let state = await this.repository.findStreakState(userId);
    if (!state) {
      state = {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        lastStreakDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    if (state.lastStreakDate === null) {
      state.currentStreak = 1;
      state.longestStreak = 1;
      state.lastStreakDate = localDate;
      state.lastActivityDate = localDate;
    } else if (state.lastStreakDate === localDate) {
      return;
    } else if (state.lastStreakDate < localDate) {
      const gap = daysBetween(state.lastStreakDate, localDate);
      if (gap === 1) {
        state.currentStreak += 1;
        state.lastStreakDate = localDate;
        state.lastActivityDate = localDate;
      } else {
        state.currentStreak = 1;
        state.lastStreakDate = localDate;
        state.lastActivityDate = localDate;
      }
    }

    if (state.currentStreak > state.longestStreak) {
      state.longestStreak = state.currentStreak;
    }

    state.updatedAt = new Date();
    await this.repository.upsertStreakState(state);
  }
}

function toLocalDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysBetween(start: string, end: string): number {
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
