import { DisciplineScoreFactorKey } from './discipline-score.types';

/** Bounds every discipline score must fall within. */
export const DISCIPLINE_SCORE_MIN = 0;
export const DISCIPLINE_SCORE_MAX = 100;

/**
 * Base weight of each factor. Must sum to 1.
 * When a factor is excluded (missing optional data), its weight is
 * redistributed proportionally across the remaining included factors —
 * see `discipline-score.calculator.ts`.
 */
export const DISCIPLINE_SCORE_FACTOR_WEIGHTS: Record<DisciplineScoreFactorKey, number> = {
  savingConsistency: 0.35,
  streakLength: 0.25,
  goalProgress: 0.2,
  repaymentHistory: 0.2,
};

/** Human-readable labels for each factor, safe to render directly in the UI. */
export const DISCIPLINE_SCORE_FACTOR_LABELS: Record<DisciplineScoreFactorKey, string> = {
  savingConsistency: 'Saving Consistency',
  streakLength: 'Streak Length',
  goalProgress: 'Goal Progress',
  repaymentHistory: 'Repayment History',
};

/**
 * Streak length (in days) at which the streak factor reaches its maximum
 * raw score of 100. Longer streaks are clamped, not extrapolated.
 */
export const STREAK_SCORE_CAP_DAYS = 60;

/**
 * Shown alongside every discipline score response. Encodes the
 * compliance constraint directly in the API contract: this is not a
 * credit score and is never used for automated lending, eligibility, or
 * other adverse decisions.
 */
export const DISCIPLINE_SCORE_DISCLAIMER =
  'This discipline score reflects saving behavior within Vaulty. It is not a credit score, ' +
  'is not shared with lenders, and is never used to make automated lending, eligibility, or ' +
  'other adverse decisions.';

/** Base path this module's router is mounted at. */
export const DISCIPLINE_SCORE_BASE_PATH = '/api/v1/discipline-score';
