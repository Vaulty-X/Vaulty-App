export class YieldRateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YieldRateValidationError';
  }
}

export interface YieldRateValidationOptions {
  /**
   * The maximum acceptable yield rate (decimal). 
   * For example, 1.0 represents 100% APY.
   */
  maxSafeLimit: number;
}

const DEFAULT_OPTIONS: YieldRateValidationOptions = {
  maxSafeLimit: 1.0, // Default to 100% APY as safety limit
};

/**
 * Validates a yield rate ensuring it is a proper decimal number, non-negative, and within safe limits.
 *
 * @param rate The yield rate to validate (decimal, e.g., 0.05 for 5%)
 * @param options Validation options (e.g., maximum safe limit)
 * @returns true if valid, throws an error otherwise.
 */
export function validateYieldRate(
  rate: number,
  options: YieldRateValidationOptions = DEFAULT_OPTIONS
): boolean {
  if (typeof rate !== 'number' || isNaN(rate)) {
    throw new YieldRateValidationError('Yield rate must be a valid number');
  }

  if (rate < 0) {
    throw new YieldRateValidationError('Yield rate cannot be negative');
  }

  if (rate > options.maxSafeLimit) {
    throw new YieldRateValidationError(
      `Yield rate of ${rate} exceeds the maximum safety limit of ${options.maxSafeLimit}`
    );
  }

  return true;
}
