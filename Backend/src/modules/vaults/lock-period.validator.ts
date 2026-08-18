import { z } from 'zod';

/**
 * Maximum allowed vault lock period in days (10 years).
 */
export const MAX_LOCK_PERIOD_DAYS = 3_650;

/**
 * Schema for a vault lock period.
 *
 * Lock periods are expressed in whole days and must be positive,
 * so invalid durations never reach persistence or contract-integration layers.
 */
export const lockPeriodSchema = z
  .number({
    required_error: 'Lock period is required',
    invalid_type_error: 'Lock period must be a number',
  })
  .finite('Lock period must be a finite number')
  .int('Lock period must be a whole number of days')
  .positive('Lock period must be greater than 0')
  .max(MAX_LOCK_PERIOD_DAYS, `Lock period must not exceed ${MAX_LOCK_PERIOD_DAYS} days`);

export type LockPeriodValidationResult =
  | { success: true; value: number }
  | { success: false; errors: string[] };

/**
 * Validates a vault lock period, returning either the validated value
 * or a consistent list of validation error messages.
 */
export function validateLockPeriod(input: unknown): LockPeriodValidationResult {
  const parsed = lockPeriodSchema.safeParse(input);

  if (parsed.success) {
    return { success: true, value: parsed.data };
  }

  return {
    success: false,
    errors: parsed.error.issues.map((issue) => issue.message),
  };
}
