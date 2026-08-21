/**
 * Score Change Classifier
 *
 * Provides a consistent way to compare two discipline scores and determine
 * whether the score improved, declined, or remained unchanged.
 *
 * Avoids duplicate comparison logic scattered across consumers of discipline-score data.
 */

/**
 * The direction of a score change.
 *
 * - `increased`  – current score is higher than the previous score
 * - `decreased`  – current score is lower than the previous score
 * - `unchanged`  – both scores are equal
 */
export type ScoreChangeDirection = 'increased' | 'decreased' | 'unchanged';

/**
 * The result returned by `classifyScoreChange`.
 */
export interface ScoreChangeResult {
  /** Whether the score went up, down, or stayed the same. */
  direction: ScoreChangeDirection;
  /**
   * The absolute difference between the current and previous score.
   * Always a non-negative number.
   *
   * @example
   * // current = 80, previous = 60  →  pointDifference = 20
   * // current = 60, previous = 80  →  pointDifference = 20
   * // current = 70, previous = 70  →  pointDifference = 0
   */
  pointDifference: number;
  /**
   * Whether the previous score was unavailable (null/undefined).
   * When true, direction will always be `'unchanged'` and pointDifference
   * will be 0 because there is nothing meaningful to compare against.
   */
  noPreviousScore: boolean;
}

/**
 * Classifies the change between a current and an optional previous discipline score.
 *
 * When `previousScore` is `null` or `undefined`, the function treats the
 * comparison as safe and returns `unchanged` with a `pointDifference` of 0
 * and `noPreviousScore` set to `true`.
 *
 * @param currentScore  - The latest discipline score (must be a finite number ≥ 0).
 * @param previousScore - The earlier discipline score to compare against, or
 *                        `null`/`undefined` if no prior score exists.
 * @returns A `ScoreChangeResult` describing direction, point difference, and
 *          whether a previous score was available.
 *
 * @throws {Error} If `currentScore` is not a finite number or is negative.
 * @throws {Error} If `previousScore` is provided but is not a finite number or is negative.
 *
 * @example
 * classifyScoreChange(80, 60)
 * // → { direction: 'increased', pointDifference: 20, noPreviousScore: false }
 *
 * @example
 * classifyScoreChange(55, 70)
 * // → { direction: 'decreased', pointDifference: 15, noPreviousScore: false }
 *
 * @example
 * classifyScoreChange(70, 70)
 * // → { direction: 'unchanged', pointDifference: 0, noPreviousScore: false }
 *
 * @example
 * classifyScoreChange(70, null)
 * // → { direction: 'unchanged', pointDifference: 0, noPreviousScore: true }
 */
export function classifyScoreChange(
  currentScore: number,
  previousScore: number | null | undefined,
): ScoreChangeResult {
  // Validate currentScore
  if (typeof currentScore !== 'number' || isNaN(currentScore) || !isFinite(currentScore)) {
    throw new Error('currentScore must be a finite number');
  }
  if (currentScore < 0) {
    throw new Error('currentScore cannot be negative');
  }

  // Handle missing previous score
  if (previousScore === null || previousScore === undefined) {
    return {
      direction: 'unchanged',
      pointDifference: 0,
      noPreviousScore: true,
    };
  }

  // Validate previousScore when provided
  if (typeof previousScore !== 'number' || isNaN(previousScore) || !isFinite(previousScore)) {
    throw new Error('previousScore must be a finite number');
  }
  if (previousScore < 0) {
    throw new Error('previousScore cannot be negative');
  }

  const pointDifference = Math.abs(currentScore - previousScore);

  let direction: ScoreChangeDirection;
  if (currentScore > previousScore) {
    direction = 'increased';
  } else if (currentScore < previousScore) {
    direction = 'decreased';
  } else {
    direction = 'unchanged';
  }

  return {
    direction,
    pointDifference,
    noPreviousScore: false,
  };
}
