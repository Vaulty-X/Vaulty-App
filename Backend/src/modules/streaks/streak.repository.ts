/**
 * Streak Repository
 *
 * Persists and reads streak state, daily activity, and freeze records.
 * Uses parameterized raw SQL against the streak tables so the module
 * remains independent of any Prisma schema. All queries are scoped by
 * `userId`, which callers must always source from the authenticated
 * request — never from a client-supplied parameter.
 */

import { PrismaClient } from '@prisma/client';
import {
  StreakDailyActivity,
  StreakDailyActivityRow,
  StreakRepository,
  UserStreakFreeze,
  UserStreakFreezeRow,
  UserStreakState,
  UserStreakStateRow,
} from './streak.types';

interface UpsertStreakStateResult {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  last_streak_date: string | null;
  created_at: Date;
  updated_at: Date;
}

function toDomainState(row: UserStreakStateRow): UserStreakState {
  return {
    userId: row.user_id,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastActivityDate: row.last_activity_date,
    lastStreakDate: row.last_streak_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDomainActivity(row: StreakDailyActivityRow): StreakDailyActivity {
  return {
    id: row.id,
    userId: row.user_id,
    activityDate: row.activity_date,
    depositId: row.deposit_id,
    createdAt: row.created_at,
  };
}

function toDomainFreeze(row: UserStreakFreezeRow): UserStreakFreeze {
  return {
    id: row.id,
    userId: row.user_id,
    freezeStartDate: row.freeze_start_date,
    freezeEndDate: row.freeze_end_date,
    isUsed: row.is_used,
    approvedAt: row.approved_at,
    usedAt: row.used_at,
    createdAt: row.created_at,
  };
}

export class PrismaStreakRepository implements StreakRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findStreakState(userId: string): Promise<UserStreakState | null> {
    const rows = await this.prisma.$queryRaw<UserStreakStateRow[]>`
      SELECT id, user_id, current_streak, longest_streak, last_activity_date, last_streak_date, created_at, updated_at
      FROM user_streak_states
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    const [row] = rows;
    return row ? toDomainState(row) : null;
  }

  async upsertStreakState(state: UserStreakState): Promise<UserStreakState> {
    const result = await this.prisma.$queryRaw<UpsertStreakStateResult[]>`
      INSERT INTO user_streak_states (user_id, current_streak, longest_streak, last_activity_date, last_streak_date, created_at, updated_at)
      VALUES (
        ${state.userId},
        ${state.currentStreak},
        ${state.longestStreak},
        ${state.lastActivityDate},
        ${state.lastStreakDate},
        ${state.createdAt},
        ${state.updatedAt}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        current_streak = EXCLUDED.current_streak,
        longest_streak = EXCLUDED.longest_streak,
        last_activity_date = EXCLUDED.last_activity_date,
        last_streak_date = EXCLUDED.last_streak_date,
        updated_at = EXCLUDED.updated_at
      RETURNING current_streak, longest_streak, last_activity_date, last_streak_date, created_at, updated_at
    `;

    const [row] = result;
    return {
      userId: state.userId,
      currentStreak: row.current_streak,
      longestStreak: row.longest_streak,
      lastActivityDate: row.last_activity_date,
      lastStreakDate: row.last_streak_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findDailyActivities(
    userId: string,
    fromDate: string,
    toDate: string
  ): Promise<StreakDailyActivity[]> {
    const rows = await this.prisma.$queryRaw<StreakDailyActivityRow[]>`
      SELECT id, user_id, activity_date, deposit_id, created_at
      FROM streak_daily_activities
      WHERE user_id = ${userId}
        AND activity_date >= ${fromDate}
        AND activity_date <= ${toDate}
      ORDER BY activity_date DESC
    `;

    return rows.map(toDomainActivity);
  }

  async recordDailyActivity(params: {
    userId: string;
    activityDate: string;
    depositId: string;
  }): Promise<StreakDailyActivity> {
    const rows = await this.prisma.$queryRaw<StreakDailyActivityRow[]>`
      INSERT INTO streak_daily_activities (user_id, activity_date, deposit_id)
      VALUES (${params.userId}, ${params.activityDate}, ${params.depositId})
      ON CONFLICT (deposit_id) DO NOTHING
      RETURNING id, user_id, activity_date, deposit_id, created_at
    `;

    if (rows.length > 0) {
      return toDomainActivity(rows[0]);
    }

    const existing = await this.prisma.$queryRaw<StreakDailyActivityRow[]>`
      SELECT id, user_id, activity_date, deposit_id, created_at
      FROM streak_daily_activities
      WHERE user_id = ${params.userId}
        AND activity_date = ${params.activityDate}
        AND deposit_id = ${params.depositId}
      LIMIT 1
    `;

    const [row] = existing;
    if (!row) {
      throw new Error('Failed to record daily activity');
    }

    return toDomainActivity(row);
  }

  async findActiveFreeze(userId: string): Promise<UserStreakFreeze | null> {
    const rows = await this.prisma.$queryRaw<UserStreakFreezeRow[]>`
      SELECT id, user_id, freeze_start_date, freeze_end_date, is_used, approved_at, used_at, created_at
      FROM user_streak_freezes
      WHERE user_id = ${userId}
        AND is_used = FALSE
        AND approved_at IS NOT NULL
        AND freeze_end_date >= CURRENT_DATE
      ORDER BY freeze_start_date ASC
      LIMIT 1
    `;

    const [row] = rows;
    return row ? toDomainFreeze(row) : null;
  }

  async createFreeze(params: {
    userId: string;
    freezeStartDate: string;
    freezeEndDate: string;
    approvedAt: Date | null;
  }): Promise<UserStreakFreeze> {
    const rows = await this.prisma.$queryRaw<UserStreakFreezeRow[]>`
      INSERT INTO user_streak_freezes (user_id, freeze_start_date, freeze_end_date, approved_at)
      VALUES (${params.userId}, ${params.freezeStartDate}, ${params.freezeEndDate}, ${params.approvedAt})
      RETURNING id, user_id, freeze_start_date, freeze_end_date, is_used, approved_at, used_at, created_at
    `;

    const [row] = rows;
    return toDomainFreeze(row);
  }

  async markFreezeUsed(freezeId: string, usedAt: Date): Promise<UserStreakFreeze | null> {
    const rows = await this.prisma.$queryRaw<UserStreakFreezeRow[]>`
      UPDATE user_streak_freezes
      SET is_used = TRUE, used_at = ${usedAt}
      WHERE id = ${freezeId}
        AND is_used = FALSE
      RETURNING id, user_id, freeze_start_date, freeze_end_date, is_used, approved_at, used_at, created_at
    `;

    const [row] = rows;
    return row ? toDomainFreeze(row) : null;
  }
}
