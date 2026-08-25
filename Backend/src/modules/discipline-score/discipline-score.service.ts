/**
 * Discipline Score Service
 *
 * Orchestrates the calculator, repository, and data provider. This is
 * the only layer that decides *when* a new snapshot is persisted, and
 * the only layer the controller and recalculation job talk to — neither
 * of them touches the repository or calculator directly.
 */

import { calculateDisciplineScore } from './discipline-score.calculator';
import {
  DisciplineScoreDataProvider,
  DisciplineScoreFactorBreakdown,
  DisciplineScoreRepository,
  DisciplineScoreResult,
  DisciplineScoreSnapshot,
} from './discipline-score.types';

export interface DisciplineScoreRecalculationResult {
  snapshot: DisciplineScoreSnapshot;
  /** True when this call produced (and persisted) a new snapshot. */
  created: boolean;
}

export class DisciplineScoreService {
  constructor(
    private readonly repository: DisciplineScoreRepository,
    private readonly dataProvider: DisciplineScoreDataProvider
  ) {}

  /**
   * Returns the user's latest discipline score snapshot, computing and
   * persisting an initial one if none exists yet. Always scoped to the
   * given `userId` — callers must pass the authenticated user's own id.
   */
  async getLatestScoreForUser(userId: string): Promise<DisciplineScoreSnapshot> {
    const existing = await this.repository.findLatestByUserId(userId);
    if (existing) {
      return existing;
    }

    const { snapshot } = await this.recalculateForUser(userId);
    return snapshot;
  }

  /**
   * Recomputes the user's discipline score from current ledger data and
   * persists a new snapshot only when the result actually changed from
   * the most recent one, so recalculation jobs don't create noisy,
   * identical snapshots on every run.
   */
  async recalculateForUser(userId: string): Promise<DisciplineScoreRecalculationResult> {
    const inputs = await this.dataProvider.getInputsForUser(userId);
    const result = calculateDisciplineScore(inputs);
    const latest = await this.repository.findLatestByUserId(userId);

    if (latest && isEquivalentResult(latest, result)) {
      return { snapshot: latest, created: false };
    }

    const snapshot = await this.repository.createSnapshot(userId, result);
    return { snapshot, created: true };
  }
}

/**
 * Compares a persisted snapshot to a freshly-calculated result on the
 * fields that matter to the user (score + each factor's inclusion and
 * raw score), ignoring `calculatedAt`/timestamps so re-running the
 * calculation with unchanged inputs never produces a "changed" result.
 */
function isEquivalentResult(
  previous: DisciplineScoreSnapshot,
  next: DisciplineScoreResult
): boolean {
  if (previous.score !== next.score) {
    return false;
  }

  if (previous.factors.length !== next.factors.length) {
    return false;
  }

  return previous.factors.every((factor, index) =>
    isEquivalentFactor(factor, next.factors[index])
  );
}

function isEquivalentFactor(
  previous: DisciplineScoreFactorBreakdown,
  next: DisciplineScoreFactorBreakdown | undefined
): boolean {
  return (
    next !== undefined &&
    previous.key === next.key &&
    previous.included === next.included &&
    previous.rawScore === next.rawScore
  );
}
