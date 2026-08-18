import { validateLockPeriod, lockPeriodSchema, MAX_LOCK_PERIOD_DAYS } from '../lock-period.validator';

describe('validateLockPeriod', () => {
  describe('accepts positive whole-day lock periods', () => {
    it.each([1, 7, 30, 90, 365, MAX_LOCK_PERIOD_DAYS])(
      'accepts a lock period of %d days',
      (days) => {
        expect(validateLockPeriod(days)).toEqual({ success: true, value: days });
      }
    );
  });

  describe('rejects lock periods longer than the maximum', () => {
    it.each([MAX_LOCK_PERIOD_DAYS + 1, 4_000, 10_000])(
      'rejects a lock period of %d days',
      (days) => {
        expect(validateLockPeriod(days)).toEqual({
          success: false,
          errors: [`Lock period must not exceed ${MAX_LOCK_PERIOD_DAYS} days`],
        });
      }
    );
  });

  describe('rejects invalid input', () => {
    it.each([30.5, 0.5, -1, 0])('rejects the numeric value %d', (input) => {
      const result = validateLockPeriod(input);
      expect(result.success).toBe(false);
      if (result.success) {
        throw new Error('Expected validation to fail');
      }
      expect(result.errors).toHaveLength(1);
    });

    it.each(['30', 'abc', null, true, {}, []])(
      'rejects non-numeric input %j',
      (input) => {
        const result = validateLockPeriod(input);
        expect(result.success).toBe(false);
        if (result.success) {
          throw new Error('Expected validation to fail');
        }
        expect(result.errors).toEqual(['Lock period must be a number']);
      }
    );

    it('rejects a missing lock period with a required error', () => {
      const result = validateLockPeriod(undefined);
      expect(result.success).toBe(false);
      if (result.success) {
        throw new Error('Expected validation to fail');
      }
      expect(result.errors).toEqual(['Lock period is required']);
    });

    it('rejects NaN and Infinity', () => {
      expect(validateLockPeriod(Number.NaN).success).toBe(false);
      expect(validateLockPeriod(Number.POSITIVE_INFINITY).success).toBe(false);
    });
  });

  describe('returns consistent validation errors', () => {
    it('rejects decimals with a whole-day error', () => {
      expect(validateLockPeriod(30.5)).toEqual({
        success: false,
        errors: ['Lock period must be a whole number of days'],
      });
    });

    it('rejects negative and zero values with a positive error', () => {
      expect(validateLockPeriod(-30)).toEqual({
        success: false,
        errors: ['Lock period must be greater than 0'],
      });
      expect(validateLockPeriod(0)).toEqual({
        success: false,
        errors: ['Lock period must be greater than 0'],
      });
    });

    it('collects every violation for an input that fails multiple rules', () => {
      expect(validateLockPeriod(-30.5)).toEqual({
        success: false,
        errors: [
          'Lock period must be a whole number of days',
          'Lock period must be greater than 0',
        ],
      });
    });
  });
});

describe('lockPeriodSchema', () => {
  it('parses a valid lock period', () => {
    expect(lockPeriodSchema.parse(30)).toBe(30);
  });

  it('is reusable inside larger request schemas', () => {
    const createVaultBodySchema = lockPeriodSchema.optional();
    expect(createVaultBodySchema.safeParse(undefined).success).toBe(true);
    expect(createVaultBodySchema.safeParse(30).success).toBe(true);
    expect(createVaultBodySchema.safeParse(-1).success).toBe(false);
  });
});
