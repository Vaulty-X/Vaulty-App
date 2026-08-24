/**
 * Streak Validator
 *
 * Validates inputs for the streaks module endpoints.
 */

import { z } from 'zod';

/**
 * Maximum number of days a freeze can span.
 */
export const FREEZE_MAX_DURATION_DAYS = 7;

/**
 * Minimum number of days a freeze can span.
 */
export const FREEZE_MIN_DURATION_DAYS = 1;

/**
 * Schema for freeze duration.
 */
export const freezeDurationSchema = z
  .number({
    required_error: 'Freeze duration is required',
    invalid_type_error: 'Freeze duration must be a number',
  })
  .int('Freeze duration must be a whole number of days')
  .min(FREEZE_MIN_DURATION_DAYS, `Freeze duration must be at least ${FREEZE_MIN_DURATION_DAYS} day`)
  .max(FREEZE_MAX_DURATION_DAYS, `Freeze duration must not exceed ${FREEZE_MAX_DURATION_DAYS} days`);

export type FreezeDurationValidationResult =
  | { success: true; value: number }
  | { success: false; errors: string[] };

export function validateFreezeDuration(input: unknown): FreezeDurationValidationResult {
  const parsed = freezeDurationSchema.safeParse(input);

  if (parsed.success) {
    return { success: true, value: parsed.data };
  }

  return {
    success: false,
    errors: parsed.error.issues.map((issue) => issue.message),
  };
}
