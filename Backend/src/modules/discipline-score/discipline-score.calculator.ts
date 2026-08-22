/**
 * Discipline Score Calculator
 *
 * Pure, side-effect-free calculation of a bounded [0, 100] discipline
 * score from confirmed ledger data. No I/O, no persistence — this module
 * only turns `DisciplineScoreInputs` into a `DisciplineScoreResult`.
 *
 * Weighting:
 *   savingConsistency 35% · streakLength 25% · goalProgress 20% · repaymentHistory 20%
 *
 * `goalProgress` and `repaymentHistory` are optional: when a user has no
 * active goals, or no confirmed repayment history, that factor is
 * excluded and its weight is redistributed proportionally across the
 * remaining included factors so the weights always sum to 1.
 */

import {
  DisciplineScoreFactorBreakdown,
  DisciplineScoreFactorKey,
  DisciplineScoreInputs,
  DisciplineScoreResult,
  GoalProgressInput,
  RepaymentHistoryInput,
  SavingConsistencyInput,
  StreakInput,
} from './discipline-score.types';
import {
  DISCIPLINE_SCORE_FACTOR_LABELS,
  DISCIPLINE_SCORE_FACTOR_WEIGHTS,
  DISCIPLINE_SCORE_MAX,
  DISCIPLINE_SCORE_MIN,
  STREAK_SCORE_CAP_DAYS,
} from './discipline-score.constants';

export class DisciplineScoreCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DisciplineScoreCalculationError';
  }
}

/** Clamps a raw factor score into [0, 100], treating non-finite values as 0. */
function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return DISCIPLINE_SCORE_MIN;
  }
  return Math.min(DISCIPLINE_SCORE_MAX, Math.max(DISCIPLINE_SCORE_MIN, value));
}

function assertFiniteNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new DisciplineScoreCalculationError(`${field} must be a finite number`);
  }
  if (value < 0) {
    throw new DisciplineScoreCalculationError(`${field} cannot be negative`);
  }
}

function computeSavingConsistencyRawScore(input: SavingConsistencyInput): number {
  assertFiniteNonNegative(input.expectedPeriods, 'expectedPeriods');
  assertFiniteNonNegative(input.activePeriods, 'activePeriods');

  if (input.expectedPeriods === 0) {
    // No saving periods have elapsed yet (e.g. a brand-new account).
    // Score as 0 rather than throwing — a new user simply hasn't had a
    // chance to demonstrate consistency yet.
    return 0;
  }

  return clampScore((input.activePeriods / input.expectedPeriods) * 100);
}

function computeStreakRawScore(input: StreakInput): number {
  assertFiniteNonNegative(input.currentStreakDays, 'currentStreakDays');
  return clampScore((input.currentStreakDays / STREAK_SCORE_CAP_DAYS) * 100);
}

function computeGoalProgressRawScore(input: GoalProgressInput): number {
  const perGoalScores = input.goals.map((goal, index) => {
    assertFiniteNonNegative(goal.targetAmount, `goals[${index}].targetAmount`);
    assertFiniteNonNegative(goal.currentAmount, `goals[${index}].currentAmount`);

    if (goal.targetAmount === 0) {
      return 0;
    }

    return clampScore((goal.currentAmount / goal.targetAmount) * 100);
  });

  if (perGoalScores.length === 0) {
    return 0;
  }

  const average = perGoalScores.reduce((sum, score) => sum + score, 0) / perGoalScores.length;
  return clampScore(average);
}

function computeRepaymentRawScore(input: RepaymentHistoryInput): number {
  assertFiniteNonNegative(input.confirmedRepayments, 'confirmedRepayments');
  assertFiniteNonNegative(input.onTimeRepayments, 'onTimeRepayments');

  if (input.onTimeRepayments > input.confirmedRepayments) {
    throw new DisciplineScoreCalculationError(
      'onTimeRepayments cannot exceed confirmedRepayments'
    );
  }

  if (input.confirmedRepayments === 0) {
    return 0;
  }

  return clampScore((input.onTimeRepayments / input.confirmedRepayments) * 100);
}

interface FactorEvaluation {
  score: number;
  included: boolean;
  reason?: string;
}

/**
 * Calculates a bounded discipline score and its transparent factor
 * breakdown from confirmed ledger data.
 *
 * @param inputs Ledger-derived inputs for a single user.
 * @param now Injectable clock for deterministic tests. Defaults to `new Date()`.
 */
export function calculateDisciplineScore(
  inputs: DisciplineScoreInputs,
  now: Date = new Date()
): DisciplineScoreResult {
  const evaluations: Record<DisciplineScoreFactorKey, FactorEvaluation> = {
    savingConsistency: {
      score: computeSavingConsistencyRawScore(inputs.savingConsistency),
      included: true,
    },
    streakLength: {
      score: computeStreakRawScore(inputs.streak),
      included: true,
    },
    goalProgress:
      inputs.goalProgress && inputs.goalProgress.goals.length > 0
        ? { score: computeGoalProgressRawScore(inputs.goalProgress), included: true }
        : { score: 0, included: false, reason: 'No active savings goals' },
    repaymentHistory:
      inputs.repaymentHistory && inputs.repaymentHistory.confirmedRepayments > 0
        ? { score: computeRepaymentRawScore(inputs.repaymentHistory), included: true }
        : { score: 0, included: false, reason: 'No confirmed repayment history' },
  };

  const factorKeys = Object.keys(DISCIPLINE_SCORE_FACTOR_WEIGHTS) as DisciplineScoreFactorKey[];
  const includedKeys = factorKeys.filter((key) => evaluations[key].included);

  if (includedKeys.length === 0) {
    // Unreachable in practice — savingConsistency and streakLength are
    // always included — but guarded explicitly so the calculator never
    // silently divides by zero if that invariant ever changes.
    throw new DisciplineScoreCalculationError(
      'At least one discipline score factor must have data available'
    );
  }

  const includedWeightSum = includedKeys.reduce(
    (sum, key) => sum + DISCIPLINE_SCORE_FACTOR_WEIGHTS[key],
    0
  );

  let unroundedTotal = 0;

  const factors: DisciplineScoreFactorBreakdown[] = factorKeys.map((key) => {
    const evaluation = evaluations[key];
    const baseWeight = DISCIPLINE_SCORE_FACTOR_WEIGHTS[key];
    const appliedWeight = evaluation.included ? baseWeight / includedWeightSum : 0;
    const weightedContribution = evaluation.included ? evaluation.score * appliedWeight : 0;

    unroundedTotal += weightedContribution;

    const breakdown: DisciplineScoreFactorBreakdown = {
      key,
      label: DISCIPLINE_SCORE_FACTOR_LABELS[key],
      included: evaluation.included,
      rawScore: roundTo(evaluation.score, 2),
      baseWeight,
      appliedWeight: roundTo(appliedWeight, 4),
      weightedContribution: roundTo(weightedContribution, 2),
    };

    if (evaluation.reason) {
      breakdown.reason = evaluation.reason;
    }

    return breakdown;
  });

  return {
    score: clampScore(Math.round(unroundedTotal)),
    factors,
    calculatedAt: now,
  };
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
