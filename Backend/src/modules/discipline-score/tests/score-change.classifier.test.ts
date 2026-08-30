import {
  classifyScoreChange,
  ScoreChangeDirection,
  ScoreChangeResult,
} from '../score-change.classifier';

describe('classifyScoreChange', () => {
  // ── Direction classification ────────────────────────────────────────────────

  describe('direction classification', () => {
    it('returns "increased" when current score is higher than previous', () => {
      const result = classifyScoreChange(80, 60);
      expect(result.direction).toBe<ScoreChangeDirection>('increased');
    });

    it('returns "decreased" when current score is lower than previous', () => {
      const result = classifyScoreChange(55, 70);
      expect(result.direction).toBe<ScoreChangeDirection>('decreased');
    });

    it('returns "unchanged" when current score equals previous', () => {
      const result = classifyScoreChange(70, 70);
      expect(result.direction).toBe<ScoreChangeDirection>('unchanged');
    });
  });

  // ── Point difference ────────────────────────────────────────────────────────

  describe('pointDifference', () => {
    it('returns the correct absolute difference when score increased', () => {
      const result = classifyScoreChange(80, 60);
      expect(result.pointDifference).toBe(20);
    });

    it('returns the correct absolute difference when score decreased', () => {
      const result = classifyScoreChange(60, 80);
      expect(result.pointDifference).toBe(20);
    });

    it('returns 0 when score is unchanged', () => {
      const result = classifyScoreChange(70, 70);
      expect(result.pointDifference).toBe(0);
    });

    it('always returns a non-negative value regardless of direction', () => {
      expect(classifyScoreChange(30, 90).pointDifference).toBeGreaterThanOrEqual(0);
      expect(classifyScoreChange(90, 30).pointDifference).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Missing previous score ──────────────────────────────────────────────────

  describe('missing previous score', () => {
    it('handles null previousScore safely', () => {
      const result = classifyScoreChange(70, null);
      expect(result).toEqual<ScoreChangeResult>({
        direction: 'unchanged',
        pointDifference: 0,
        noPreviousScore: true,
      });
    });

    it('handles undefined previousScore safely', () => {
      const result = classifyScoreChange(70, undefined);
      expect(result).toEqual<ScoreChangeResult>({
        direction: 'unchanged',
        pointDifference: 0,
        noPreviousScore: true,
      });
    });

    it('sets noPreviousScore to false when a valid previous score is provided', () => {
      const result = classifyScoreChange(70, 60);
      expect(result.noPreviousScore).toBe(false);
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles a current score of 0 with a previous score of 0', () => {
      const result = classifyScoreChange(0, 0);
      expect(result.direction).toBe('unchanged');
      expect(result.pointDifference).toBe(0);
      expect(result.noPreviousScore).toBe(false);
    });

    it('handles a current score of 0 with no previous score', () => {
      const result = classifyScoreChange(0, null);
      expect(result.direction).toBe('unchanged');
      expect(result.pointDifference).toBe(0);
      expect(result.noPreviousScore).toBe(true);
    });

    it('handles fractional (decimal) scores correctly', () => {
      const result = classifyScoreChange(72.5, 68.3);
      expect(result.direction).toBe('increased');
      expect(result.pointDifference).toBeCloseTo(4.2, 5);
    });

    it('handles a score drop to 0', () => {
      const result = classifyScoreChange(0, 50);
      expect(result.direction).toBe('decreased');
      expect(result.pointDifference).toBe(50);
    });

    it('handles a jump from 0', () => {
      const result = classifyScoreChange(50, 0);
      expect(result.direction).toBe('increased');
      expect(result.pointDifference).toBe(50);
    });
  });

  // ── Input validation ────────────────────────────────────────────────────────

  describe('input validation', () => {
    it('throws when currentScore is NaN', () => {
      expect(() => classifyScoreChange(NaN, 50)).toThrow('currentScore must be a finite number');
    });

    it('throws when currentScore is Infinity', () => {
      expect(() => classifyScoreChange(Infinity, 50)).toThrow('currentScore must be a finite number');
    });

    it('throws when currentScore is negative', () => {
      expect(() => classifyScoreChange(-1, 50)).toThrow('currentScore cannot be negative');
    });

    it('throws when previousScore is NaN', () => {
      expect(() => classifyScoreChange(50, NaN)).toThrow('previousScore must be a finite number');
    });

    it('throws when previousScore is Infinity', () => {
      expect(() => classifyScoreChange(50, Infinity)).toThrow('previousScore must be a finite number');
    });

    it('throws when previousScore is negative', () => {
      expect(() => classifyScoreChange(50, -1)).toThrow('previousScore cannot be negative');
    });

    it('throws when currentScore is passed as a non-number type', () => {
      // Testing runtime safety when TypeScript types are bypassed
      expect(() => classifyScoreChange('80' as unknown as number, 60)).toThrow(
        'currentScore must be a finite number',
      );
    });
  });
});
