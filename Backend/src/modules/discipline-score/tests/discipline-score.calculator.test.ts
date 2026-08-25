/**
 * Tests for the Discipline Score Calculator
 *
 * Covers factor weighting (including renormalization when optional
 * factors are missing), score bounds, and missing-optional-data
 * behavior, per issue #41's acceptance criteria.
 */

import {
  calculateDisciplineScore,
  DisciplineScoreCalculationError,
} from '../discipline-score.calculator';
import { DISCIPLINE_SCORE_FACTOR_WEIGHTS } from '../discipline-score.constants';
import { DisciplineScoreInputs } from '../discipline-score.types';

const FIXED_NOW = new Date('2026-08-18T00:00:00.000Z');

function baseInputs(overrides: Partial<DisciplineScoreInputs> = {}): DisciplineScoreInputs {
  return {
    savingConsistency: { expectedPeriods: 10, activePeriods: 8 },
    streak: { currentStreakDays: 30 },
    goalProgress: { goals: [{ targetAmount: 1000, currentAmount: 500 }] },
    repaymentHistory: { confirmedRepayments: 4, onTimeRepayments: 4 },
    ...overrides,
  };
}

describe('DISCIPLINE_SCORE_FACTOR_WEIGHTS', () => {
  it('sums to 1', () => {
    const sum = Object.values(DISCIPLINE_SCORE_FACTOR_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
});

describe('calculateDisciplineScore — factor weighting', () => {
  it('always returns all four factors, in a stable order', () => {
    const result = calculateDisciplineScore(baseInputs(), FIXED_NOW);
    expect(result.factors.map((f) => f.key)).toEqual([
      'savingConsistency',
      'streakLength',
      'goalProgress',
      'repaymentHistory',
    ]);
  });

  it('weights each included factor by its configured base weight when all factors are present', () => {
    const result = calculateDisciplineScore(baseInputs(), FIXED_NOW);

    for (const factor of result.factors) {
      expect(factor.included).toBe(true);
      expect(factor.appliedWeight).toBeCloseTo(factor.baseWeight, 4);
    }
  });

  it('computes an exact, hand-verified weighted score when all factors are present', () => {
    // savingConsistency: 8/10 = 80 * 0.35 = 28
    // streakLength:      30/60 = 50 * 0.25 = 12.5
    // goalProgress:      500/1000 = 50 * 0.20 = 10
    // repaymentHistory:  4/4 = 100 * 0.20 = 20
    // total = 70.5 -> rounds to 71
    const result = calculateDisciplineScore(baseInputs(), FIXED_NOW);
    expect(result.score).toBe(71);
  });

  it('records each weighted contribution correctly', () => {
    const result = calculateDisciplineScore(baseInputs(), FIXED_NOW);
    const byKey = Object.fromEntries(result.factors.map((f) => [f.key, f]));

    expect(byKey.savingConsistency.weightedContribution).toBeCloseTo(28, 2);
    expect(byKey.streakLength.weightedContribution).toBeCloseTo(12.5, 2);
    expect(byKey.goalProgress.weightedContribution).toBeCloseTo(10, 2);
    expect(byKey.repaymentHistory.weightedContribution).toBeCloseTo(20, 2);
  });

  it('redistributes an excluded factor\'s weight proportionally across the remaining factors', () => {
    const result = calculateDisciplineScore(
      baseInputs({ repaymentHistory: null }),
      FIXED_NOW
    );
    const byKey = Object.fromEntries(result.factors.map((f) => [f.key, f]));

    // Remaining base weights: 0.35 + 0.25 + 0.20 = 0.80
    expect(byKey.savingConsistency.appliedWeight).toBeCloseTo(0.35 / 0.8, 4);
    expect(byKey.streakLength.appliedWeight).toBeCloseTo(0.25 / 0.8, 4);
    expect(byKey.goalProgress.appliedWeight).toBeCloseTo(0.2 / 0.8, 4);
    expect(byKey.repaymentHistory.appliedWeight).toBe(0);

    const includedWeightSum = byKey.savingConsistency.appliedWeight +
      byKey.streakLength.appliedWeight +
      byKey.goalProgress.appliedWeight;
    expect(includedWeightSum).toBeCloseTo(1, 4);
  });
});

describe('calculateDisciplineScore — score bounds', () => {
  it('never returns a score below 0', () => {
    const result = calculateDisciplineScore(
      {
        savingConsistency: { expectedPeriods: 10, activePeriods: 0 },
        streak: { currentStreakDays: 0 },
        goalProgress: null,
        repaymentHistory: null,
      },
      FIXED_NOW
    );

    expect(result.score).toBe(0);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('never returns a score above 100', () => {
    const result = calculateDisciplineScore(
      {
        savingConsistency: { expectedPeriods: 10, activePeriods: 10 },
        streak: { currentStreakDays: 365 },
        goalProgress: { goals: [{ targetAmount: 100, currentAmount: 100 }] },
        repaymentHistory: { confirmedRepayments: 5, onTimeRepayments: 5 },
      },
      FIXED_NOW
    );

    expect(result.score).toBe(100);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('clamps a per-factor raw score to 100 even when the underlying ratio exceeds 100%', () => {
    // More active periods than expected, streak beyond the cap, and a
    // goal funded beyond its target should all still clamp to 100, not
    // overflow or push the total score above 100.
    const result = calculateDisciplineScore(
      {
        savingConsistency: { expectedPeriods: 4, activePeriods: 10 },
        streak: { currentStreakDays: 999 },
        goalProgress: { goals: [{ targetAmount: 100, currentAmount: 500 }] },
        repaymentHistory: { confirmedRepayments: 2, onTimeRepayments: 2 },
      },
      FIXED_NOW
    );

    for (const factor of result.factors) {
      expect(factor.rawScore).toBeLessThanOrEqual(100);
    }
    expect(result.score).toBe(100);
  });

  it('clamps every individual factor rawScore within [0, 100]', () => {
    const result = calculateDisciplineScore(baseInputs(), FIXED_NOW);
    for (const factor of result.factors) {
      expect(factor.rawScore).toBeGreaterThanOrEqual(0);
      expect(factor.rawScore).toBeLessThanOrEqual(100);
    }
  });
});

describe('calculateDisciplineScore — missing optional data', () => {
  it('excludes goalProgress and explains why when the user has no active goals', () => {
    const result = calculateDisciplineScore(baseInputs({ goalProgress: null }), FIXED_NOW);
    const goalFactor = result.factors.find((f) => f.key === 'goalProgress')!;

    expect(goalFactor.included).toBe(false);
    expect(goalFactor.rawScore).toBe(0);
    expect(goalFactor.weightedContribution).toBe(0);
    expect(goalFactor.reason).toMatch(/no active savings goals/i);
  });

  it('excludes goalProgress when the goals array is empty', () => {
    const result = calculateDisciplineScore(
      baseInputs({ goalProgress: { goals: [] } }),
      FIXED_NOW
    );
    const goalFactor = result.factors.find((f) => f.key === 'goalProgress')!;
    expect(goalFactor.included).toBe(false);
  });

  it('excludes repaymentHistory and explains why when the user has no confirmed repayments', () => {
    const result = calculateDisciplineScore(
      baseInputs({ repaymentHistory: null }),
      FIXED_NOW
    );
    const repaymentFactor = result.factors.find((f) => f.key === 'repaymentHistory')!;

    expect(repaymentFactor.included).toBe(false);
    expect(repaymentFactor.rawScore).toBe(0);
    expect(repaymentFactor.weightedContribution).toBe(0);
    expect(repaymentFactor.reason).toMatch(/no confirmed repayment history/i);
  });

  it('excludes repaymentHistory when confirmedRepayments is 0', () => {
    const result = calculateDisciplineScore(
      baseInputs({ repaymentHistory: { confirmedRepayments: 0, onTimeRepayments: 0 } }),
      FIXED_NOW
    );
    const repaymentFactor = result.factors.find((f) => f.key === 'repaymentHistory')!;
    expect(repaymentFactor.included).toBe(false);
  });

  it('still produces a fully bounded score when both optional factors are missing', () => {
    const result = calculateDisciplineScore(
      baseInputs({ goalProgress: null, repaymentHistory: null }),
      FIXED_NOW
    );

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);

    const includedKeys = result.factors.filter((f) => f.included).map((f) => f.key);
    expect(includedKeys).toEqual(['savingConsistency', 'streakLength']);

    // 0.35 and 0.25 renormalized over their sum (0.6) -> 0.5833.. and 0.4166..
    const byKey = Object.fromEntries(result.factors.map((f) => [f.key, f]));
    expect(byKey.savingConsistency.appliedWeight).toBeCloseTo(0.35 / 0.6, 4);
    expect(byKey.streakLength.appliedWeight).toBeCloseTo(0.25 / 0.6, 4);
  });

  it('scores a brand-new account (no elapsed saving periods) as 0 for consistency rather than throwing', () => {
    const result = calculateDisciplineScore(
      baseInputs({ savingConsistency: { expectedPeriods: 0, activePeriods: 0 } }),
      FIXED_NOW
    );
    const consistencyFactor = result.factors.find((f) => f.key === 'savingConsistency')!;
    expect(consistencyFactor.included).toBe(true);
    expect(consistencyFactor.rawScore).toBe(0);
  });
});

describe('calculateDisciplineScore — validation', () => {
  it('throws when repayment onTimeRepayments exceeds confirmedRepayments', () => {
    expect(() =>
      calculateDisciplineScore(
        baseInputs({ repaymentHistory: { confirmedRepayments: 2, onTimeRepayments: 5 } }),
        FIXED_NOW
      )
    ).toThrow(DisciplineScoreCalculationError);
  });

  it('throws on negative saving consistency inputs', () => {
    expect(() =>
      calculateDisciplineScore(
        baseInputs({ savingConsistency: { expectedPeriods: -1, activePeriods: 0 } }),
        FIXED_NOW
      )
    ).toThrow(DisciplineScoreCalculationError);
  });

  it('throws on negative streak input', () => {
    expect(() =>
      calculateDisciplineScore(baseInputs({ streak: { currentStreakDays: -1 } }), FIXED_NOW)
    ).toThrow(DisciplineScoreCalculationError);
  });

  it('throws on non-finite input', () => {
    expect(() =>
      calculateDisciplineScore(
        baseInputs({ streak: { currentStreakDays: Number.NaN } }),
        FIXED_NOW
      )
    ).toThrow(DisciplineScoreCalculationError);
  });

  it('throws on a negative goal amount', () => {
    expect(() =>
      calculateDisciplineScore(
        baseInputs({ goalProgress: { goals: [{ targetAmount: 100, currentAmount: -5 }] } }),
        FIXED_NOW
      )
    ).toThrow(DisciplineScoreCalculationError);
  });
});

describe('calculateDisciplineScore — determinism', () => {
  it('uses the injected clock for calculatedAt', () => {
    const result = calculateDisciplineScore(baseInputs(), FIXED_NOW);
    expect(result.calculatedAt).toBe(FIXED_NOW);
  });

  it('defaults calculatedAt to the current time when no clock is injected', () => {
    const before = Date.now();
    const result = calculateDisciplineScore(baseInputs());
    const after = Date.now();

    expect(result.calculatedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.calculatedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it('is a pure function: identical inputs always produce identical output', () => {
    const a = calculateDisciplineScore(baseInputs(), FIXED_NOW);
    const b = calculateDisciplineScore(baseInputs(), FIXED_NOW);
    expect(a).toEqual(b);
  });
});
