/**
 * Discipline Score Module
 *
 * Turns consistent saving behavior into a transparent, bounded [0, 100]
 * score. Not a credit score; never used for automated lending,
 * eligibility, or other adverse decisions.
 */

export {
  DISCIPLINE_SCORE_BASE_PATH,
  DISCIPLINE_SCORE_DISCLAIMER,
  DISCIPLINE_SCORE_FACTOR_LABELS,
  DISCIPLINE_SCORE_FACTOR_WEIGHTS,
  DISCIPLINE_SCORE_MAX,
  DISCIPLINE_SCORE_MIN,
  STREAK_SCORE_CAP_DAYS,
} from './discipline-score.constants';

export {
  DisciplineScoreCalculationError,
  calculateDisciplineScore,
} from './discipline-score.calculator';

export { PrismaDisciplineScoreRepository } from './discipline-score.repository';
export { PrismaDisciplineScoreDataProvider } from './discipline-score.data-provider';

export {
  DisciplineScoreService,
  type DisciplineScoreRecalculationResult,
} from './discipline-score.service';

export { DisciplineScoreController } from './discipline-score.controller';
export { createDisciplineScoreRouter } from './discipline-score.routes';

export type {
  DisciplineScoreDataProvider,
  DisciplineScoreFactorBreakdown,
  DisciplineScoreFactorKey,
  DisciplineScoreInputs,
  DisciplineScoreRepository,
  DisciplineScoreResult,
  DisciplineScoreSnapshot,
  GoalProgressEntry,
  GoalProgressInput,
  RepaymentHistoryInput,
  SavingConsistencyInput,
  StreakInput,
} from './discipline-score.types';
