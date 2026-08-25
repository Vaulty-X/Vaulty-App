/**
 * Streaks Module
 *
 * Provides durable, timezone-safe savings-streak tracking, freeze
 * support, and a daily evaluation job. Exports are grouped by concern
 * so consumers can import only what they need.
 */

// Milestone utilities
export {
  STREAK_MILESTONES,
  getNextMilestone,
  getAchievedMilestones,
  isMilestone,
  getMilestoneDays,
  getMilestoneProgress,
  getMaxMilestone,
  hasReachedMaxMilestone,
  type Milestone,
  type NextMilestoneResult,
} from './streak-milestones';

// Core types and interfaces
export type {
  DailyStreakEvaluationResult,
  DepositConfirmedEvent,
  FreezeEligibility,
  FreezeStatusResponse,
  StreakDailyActivity,
  StreakDailyActivityRow,
  StreakDataProvider,
  StreakRepository,
  StreakResponse,
  UserStreakFreeze,
  UserStreakFreezeRow,
  UserStreakState,
  UserStreakStateRow,
} from './streak.types';

// Repository
export { PrismaStreakRepository } from './streak.repository';

// Service
export { StreakService } from './streak.service';

// Events
export { handleDepositConfirmed } from './streak.events';

// Validators
export {
  FREEZE_MAX_DURATION_DAYS,
  FREEZE_MIN_DURATION_DAYS,
  freezeDurationSchema,
  validateFreezeDuration,
} from './streak.validator';

// Controller and routes
export { StreakController } from './streak.controller';
export { createStreakRouter, STREAK_BASE_PATH } from './streak.routes';
