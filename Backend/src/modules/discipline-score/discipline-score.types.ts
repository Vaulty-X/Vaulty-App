/**
 * Discipline Score Module — Types
 *
 * The discipline score turns consistent saving behavior into a single,
 * transparent 0-100 metric that can be used to unlock in-app experiences
 * (badges, higher vault limits, feature previews, etc).
 *
 * IMPORTANT — compliance constraints (see README "Rewards Service"):
 *  - This score is NOT a credit score and must never be presented as one.
 *  - It must NEVER be used, directly or indirectly, to make automated
 *    lending, eligibility, or other adverse decisions about a user.
 *  - It is derived exclusively from confirmed ledger data (deposits,
 *    streaks, goal progress, confirmed repayments). No wallet keys or
 *    signing material are ever read, stored, or referenced here.
 */

/** The four factors that contribute to a discipline score. */
export type DisciplineScoreFactorKey =
  | 'savingConsistency'
  | 'streakLength'
  | 'goalProgress'
  | 'repaymentHistory';

/**
 * How consistently the user has saved over the evaluation window.
 * Expressed as "periods" (e.g. weeks) rather than raw dates so the
 * calculator stays agnostic of the window size and calendar logic,
 * which belongs to the data provider.
 */
export interface SavingConsistencyInput {
  /** Number of saving periods expected to have elapsed in the evaluation window. */
  expectedPeriods: number;
  /** Number of those periods in which at least one confirmed deposit was made. */
  activePeriods: number;
}

/** The user's current consecutive-day saving streak, from the streaks module. */
export interface StreakInput {
  currentStreakDays: number;
}

/** A single savings goal/vault's progress toward its target amount. */
export interface GoalProgressEntry {
  targetAmount: number;
  currentAmount: number;
}

/**
 * Progress across the user's active savings goals.
 * `null` when the user has no active goals — this factor is optional and
 * is excluded (with weight redistributed to the other factors) rather
 * than penalizing users who simply haven't set a goal yet.
 */
export interface GoalProgressInput {
  goals: GoalProgressEntry[];
}

/**
 * Confirmed, ledger-recorded loan repayment activity.
 * `null` when the user has no confirmed lending/repayment history — this
 * factor is optional and is excluded (with weight redistributed) rather
 * than penalizing users who have never borrowed.
 */
export interface RepaymentHistoryInput {
  /** Total confirmed repayments recorded against ledger loan records. */
  confirmedRepayments: number;
  /** Of those, how many were on time. */
  onTimeRepayments: number;
}

/** Aggregated, ledger-derived inputs for a single user's score calculation. */
export interface DisciplineScoreInputs {
  savingConsistency: SavingConsistencyInput;
  streak: StreakInput;
  goalProgress: GoalProgressInput | null;
  repaymentHistory: RepaymentHistoryInput | null;
}

/** Transparent, per-factor contribution to the final score. */
export interface DisciplineScoreFactorBreakdown {
  key: DisciplineScoreFactorKey;
  /** Human-readable label suitable for direct display in the UI. */
  label: string;
  /** Whether this factor had data available and contributed to the score. */
  included: boolean;
  /** The factor's own 0-100 score, independent of weighting. 0 when excluded. */
  rawScore: number;
  /** The factor's configured weight before renormalization (sums to 1 across all factors). */
  baseWeight: number;
  /** The weight actually applied after redistributing the weight of any excluded factors. */
  appliedWeight: number;
  /** rawScore * appliedWeight — this factor's contribution to the final score. */
  weightedContribution: number;
  /** Present only when `included` is false, explaining why. */
  reason?: string;
}

/** The result of a single discipline score calculation. */
export interface DisciplineScoreResult {
  /** Final bounded score, an integer in [0, 100]. */
  score: number;
  factors: DisciplineScoreFactorBreakdown[];
  calculatedAt: Date;
}

/** A persisted, point-in-time discipline score snapshot. */
export interface DisciplineScoreSnapshot {
  id: string;
  userId: string;
  score: number;
  factors: DisciplineScoreFactorBreakdown[];
  createdAt: Date;
}

/**
 * Reads confirmed ledger data and assembles the raw inputs the calculator
 * needs for a given user. Kept as an injectable interface so the
 * calculator/service/controller/job are fully unit-testable without a
 * database, and so the concrete implementation can be swapped in once
 * (or as) the deposits/vaults/loans read models it depends on land.
 */
export interface DisciplineScoreDataProvider {
  getInputsForUser(userId: string): Promise<DisciplineScoreInputs>;
}

/** Persistence boundary for discipline score snapshots. */
export interface DisciplineScoreRepository {
  findLatestByUserId(userId: string): Promise<DisciplineScoreSnapshot | null>;
  createSnapshot(userId: string, result: DisciplineScoreResult): Promise<DisciplineScoreSnapshot>;
}
