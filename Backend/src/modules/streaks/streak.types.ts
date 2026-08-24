/**
 * Streaks Module — Types
 *
 * Durable, timezone-safe savings-streak state. A streak counts consecutive
 * calendar days (in the user's local timezone) on which at least one
 * confirmed deposit was made. Pending or failed deposits never extend a
 * streak.
 *
 * Timezone policy:
 *   - Each user's local timezone is stored in `users.timezone` (IANA ID,
 *     e.g. "Africa/Lagos").
 *   - A "day" is a calendar date in the user's local timezone.
 *   - The daily evaluation job runs at UTC midnight and attributes the
 *     previous UTC calendar day to each user using their timezone offset
 *     at that moment.
 *   - A deposit confirmed at `confirmedAt` is attributed to the calendar
 *     date in the user's local timezone at `confirmedAt`.
 */

/** Row shape returned from the `user_streak_states` table. */
export interface UserStreakStateRow {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  last_streak_date: string | null;
  created_at: Date;
  updated_at: Date;
}

/** Domain model for a user's streak state. */
export interface UserStreakState {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  lastStreakDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Row shape returned from the `streak_daily_activities` table. */
export interface StreakDailyActivityRow {
  id: string;
  user_id: string;
  activity_date: string;
  deposit_id: string;
  created_at: Date;
}

/** Domain model for a daily activity record. */
export interface StreakDailyActivity {
  id: string;
  userId: string;
  activityDate: string;
  depositId: string;
  createdAt: Date;
}

/** Row shape returned from the `user_streak_freezes` table. */
export interface UserStreakFreezeRow {
  id: string;
  user_id: string;
  freeze_start_date: string;
  freeze_end_date: string;
  is_used: boolean;
  approved_at: Date | null;
  used_at: Date | null;
  created_at: Date;
}

/** Domain model for a user's streak freeze. */
export interface UserStreakFreeze {
  id: string;
  userId: string;
  freezeStartDate: string;
  freezeEndDate: string;
  isUsed: boolean;
  approvedAt: Date | null;
  usedAt: Date | null;
  createdAt: Date;
}

/** Payload delivered when a deposit reaches confirmed status. */
export interface DepositConfirmedEvent {
  depositId: string;
  userId: string;
  confirmedAt: Date;
  amount: number;
}

/** Status of a freeze relative to today. */
export type FreezeEligibility =
  | { eligible: true; freeze: UserStreakFreeze }
  | { eligible: false; reason: 'none_requested' | 'not_approved' | 'expired' | 'already_used' };

/** Response shape for GET /streaks/current. */
export interface StreakResponse {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  nextMilestone: {
    days: number;
    name: string;
    description: string;
    daysRemaining: number;
  } | null;
  isMaxed: boolean;
}

/** Response shape for GET /streaks/freeze-status. */
export interface FreezeStatusResponse {
  hasEligibleFreeze: boolean;
  freeze: UserStreakFreeze | null;
}

/** Persistence boundary for streak state and daily activity. */
export interface StreakRepository {
  findStreakState(userId: string): Promise<UserStreakState | null>;
  upsertStreakState(state: UserStreakState): Promise<UserStreakState>;
  findDailyActivities(userId: string, fromDate: string, toDate: string): Promise<StreakDailyActivity[]>;
  recordDailyActivity(activity: { userId: string; activityDate: string; depositId: string }): Promise<StreakDailyActivity>;
  findActiveFreeze(userId: string): Promise<UserStreakFreeze | null>;
  createFreeze(freeze: {
    userId: string;
    freezeStartDate: string;
    freezeEndDate: string;
    approvedAt: Date | null;
  }): Promise<UserStreakFreeze>;
  markFreezeUsed(freezeId: string, usedAt: Date): Promise<UserStreakFreeze | null>;
}

/** External data the service needs but does not own. */
export interface StreakDataProvider {
  getUserTimezone(userId: string): Promise<string>;
}

/** Result of the daily streak evaluation for a single user. */
export interface DailyStreakEvaluationResult {
  userId: string;
  streakUpdated: boolean;
  newCurrentStreak: number;
  freezeUsed: boolean;
}
