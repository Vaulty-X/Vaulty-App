import { validateYieldRate, YieldRateValidationError } from '../yield-rate.validator';

describe('validateYieldRate', () => {
  it('should accept valid positive decimal rates', () => {
    expect(validateYieldRate(0.05)).toBe(true);
    expect(validateYieldRate(0.12)).toBe(true);
    expect(validateYieldRate(0.0)).toBe(true); // 0% is valid
  });

  it('should reject negative rates', () => {
    expect(() => validateYieldRate(-0.01)).toThrow(YieldRateValidationError);
    expect(() => validateYieldRate(-0.01)).toThrow('Yield rate cannot be negative');
  });

  it('should reject values above the documented safety limit', () => {
    // Default limit is 1.0
    expect(() => validateYieldRate(1.1)).toThrow(YieldRateValidationError);
    expect(() => validateYieldRate(1.1)).toThrow('Yield rate of 1.1 exceeds the maximum safety limit of 1');
  });

  it('should respect custom safety limits', () => {
    const options = { maxSafeLimit: 5.0 }; // 500% APY
    expect(validateYieldRate(2.0, options)).toBe(true);
    expect(validateYieldRate(5.0, options)).toBe(true);
    expect(() => validateYieldRate(5.1, options)).toThrow(YieldRateValidationError);
  });

  it('should reject NaN or invalid numbers', () => {
    expect(() => validateYieldRate(NaN)).toThrow(YieldRateValidationError);
    expect(() => validateYieldRate(NaN)).toThrow('Yield rate must be a valid number');
    
    // Casting string to number for testing runtime validation
    expect(() => validateYieldRate('0.05' as any)).toThrow(YieldRateValidationError);
  });
});
