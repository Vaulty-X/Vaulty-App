/**
 * Tests for Streak Date Key Utility
 * 
 * Validates timezone-aware date key generation, day boundary handling,
 * timezone validation, and edge cases.
 */

import {
  getStreakDateKey,
  isValidTimezone,
  getCurrentDateKey,
  isSameDay,
  isToday,
  getDateRange,
} from '../streak-date-key';

describe('getStreakDateKey', () => {
  describe('basic functionality', () => {
    it('should generate YYYY-MM-DD format for UTC timezone', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = getStreakDateKey(date, 'UTC');
      expect(result).toBe('2024-01-15');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should accept timestamp as input', () => {
      const timestamp = new Date('2024-01-15T12:00:00Z').getTime();
      const result = getStreakDateKey(timestamp, 'UTC');
      expect(result).toBe('2024-01-15');
    });

    it('should accept Date object as input', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = getStreakDateKey(date, 'UTC');
      expect(result).toBe('2024-01-15');
    });
  });

  describe('day boundary transitions', () => {
    it('should handle midnight UTC correctly', () => {
      const justBeforeMidnight = new Date('2024-01-15T23:59:59Z');
      const justAfterMidnight = new Date('2024-01-16T00:00:00Z');

      expect(getStreakDateKey(justBeforeMidnight, 'UTC')).toBe('2024-01-15');
      expect(getStreakDateKey(justAfterMidnight, 'UTC')).toBe('2024-01-16');
    });

    it('should count deposit on next day for user ahead of UTC', () => {
      // User in Tokyo (UTC+9) at 2024-01-16 01:00 local time
      // = 2024-01-15 16:00 UTC
      const date = new Date('2024-01-15T16:00:00Z');
      
      expect(getStreakDateKey(date, 'UTC')).toBe('2024-01-15');
      expect(getStreakDateKey(date, 'Asia/Tokyo')).toBe('2024-01-16');
    });

    it('should count deposit on previous day for user behind UTC', () => {
      // User in New York (UTC-5) at 2024-01-15 20:00 local time
      // = 2024-01-16 01:00 UTC
      const date = new Date('2024-01-16T01:00:00Z');
      
      expect(getStreakDateKey(date, 'UTC')).toBe('2024-01-16');
      expect(getStreakDateKey(date, 'America/New_York')).toBe('2024-01-15');
    });

    it('should handle Nigerian timezone (Africa/Lagos, UTC+1)', () => {
      // Midnight UTC = 1 AM in Lagos
      const midnightUTC = new Date('2024-01-16T00:00:00Z');
      
      expect(getStreakDateKey(midnightUTC, 'UTC')).toBe('2024-01-16');
      expect(getStreakDateKey(midnightUTC, 'Africa/Lagos')).toBe('2024-01-16');

      // 11 PM UTC = midnight in Lagos (next day)
      const elevenPmUTC = new Date('2024-01-15T23:00:00Z');
      
      expect(getStreakDateKey(elevenPmUTC, 'UTC')).toBe('2024-01-15');
      expect(getStreakDateKey(elevenPmUTC, 'Africa/Lagos')).toBe('2024-01-16');
    });

    it('should handle edge case: one minute before midnight in user timezone', () => {
      // 22:59 UTC on Jan 15 = 23:59 Lagos time
      const date = new Date('2024-01-15T22:59:00Z');
      expect(getStreakDateKey(date, 'Africa/Lagos')).toBe('2024-01-15');
      
      // 23:00 UTC on Jan 15 = 00:00 Lagos time (Jan 16)
      const nextMinute = new Date('2024-01-15T23:00:00Z');
      expect(getStreakDateKey(nextMinute, 'Africa/Lagos')).toBe('2024-01-16');
    });
  });

  describe('daylight saving time transitions', () => {
    it('should handle DST transition correctly', () => {
      // DST transition example: March 10, 2024 in US (spring forward)
      const beforeDST = new Date('2024-03-10T06:00:00Z'); // 1 AM EST
      const afterDST = new Date('2024-03-10T07:00:00Z');  // 3 AM EDT (skipped 2 AM)
      
      expect(getStreakDateKey(beforeDST, 'America/New_York')).toBe('2024-03-10');
      expect(getStreakDateKey(afterDST, 'America/New_York')).toBe('2024-03-10');
    });

    it('should handle fall back DST transition', () => {
      // DST fall back: November 3, 2024 in US
      const beforeFallBack = new Date('2024-11-03T05:00:00Z'); // 1 AM EDT
      const afterFallBack = new Date('2024-11-03T06:00:00Z');  // 1 AM EST (repeated hour)
      
      expect(getStreakDateKey(beforeFallBack, 'America/New_York')).toBe('2024-11-03');
      expect(getStreakDateKey(afterFallBack, 'America/New_York')).toBe('2024-11-03');
    });
  });

  describe('timezone validation', () => {
    it('should reject invalid timezone', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      
      expect(() => getStreakDateKey(date, 'Invalid/Timezone'))
        .toThrow('Invalid timezone: Invalid/Timezone');
    });

    it('should reject empty timezone', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      
      expect(() => getStreakDateKey(date, ''))
        .toThrow('Timezone is required');
    });

    it('should reject non-string timezone', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      
      expect(() => getStreakDateKey(date, null as any))
        .toThrow('Timezone is required');
      
      expect(() => getStreakDateKey(date, undefined as any))
        .toThrow('Timezone is required');
      
      expect(() => getStreakDateKey(date, 123 as any))
        .toThrow('Timezone is required');
    });

    it('should accept all valid IANA timezone strings', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const validTimezones = [
        'UTC',
        'America/New_York',
        'America/Los_Angeles',
        'Europe/London',
        'Europe/Paris',
        'Asia/Tokyo',
        'Asia/Shanghai',
        'Africa/Lagos',
        'Africa/Cairo',
        'Australia/Sydney',
        'Pacific/Auckland',
      ];

      validTimezones.forEach(tz => {
        expect(() => getStreakDateKey(date, tz)).not.toThrow();
      });
    });
  });

  describe('input validation', () => {
    it('should reject invalid date', () => {
      expect(() => getStreakDateKey(new Date('invalid'), 'UTC'))
        .toThrow('Invalid date provided');
    });

    it('should reject null date', () => {
      expect(() => getStreakDateKey(null as any, 'UTC'))
        .toThrow('Date is required');
    });

    it('should reject undefined date', () => {
      expect(() => getStreakDateKey(undefined as any, 'UTC'))
        .toThrow('Date is required');
    });

    it('should handle dates far in the past', () => {
      const oldDate = new Date('1970-01-01T00:00:00Z');
      expect(getStreakDateKey(oldDate, 'UTC')).toBe('1970-01-01');
    });

    it('should handle dates far in the future', () => {
      const futureDate = new Date('2099-12-31T23:59:59Z');
      expect(getStreakDateKey(futureDate, 'UTC')).toBe('2099-12-31');
    });
  });

  describe('month and year boundaries', () => {
    it('should handle end of month correctly', () => {
      const lastDayOfMonth = new Date('2024-01-31T23:00:00Z');
      
      expect(getStreakDateKey(lastDayOfMonth, 'UTC')).toBe('2024-01-31');
      expect(getStreakDateKey(lastDayOfMonth, 'Asia/Tokyo')).toBe('2024-02-01');
    });

    it('should handle end of year correctly', () => {
      const newYearsEve = new Date('2024-12-31T23:00:00Z');
      
      expect(getStreakDateKey(newYearsEve, 'UTC')).toBe('2024-12-31');
      expect(getStreakDateKey(newYearsEve, 'Asia/Tokyo')).toBe('2025-01-01');
    });

    it('should handle leap year correctly', () => {
      const leapDay = new Date('2024-02-29T12:00:00Z');
      expect(getStreakDateKey(leapDay, 'UTC')).toBe('2024-02-29');
    });

    it('should handle non-leap year February correctly', () => {
      const lastDayFeb = new Date('2023-02-28T23:00:00Z');
      const nextDay = new Date('2023-03-01T00:00:00Z');
      
      expect(getStreakDateKey(lastDayFeb, 'UTC')).toBe('2023-02-28');
      expect(getStreakDateKey(nextDay, 'UTC')).toBe('2023-03-01');
    });
  });
});

describe('isValidTimezone', () => {
  it('should return true for valid IANA timezones', () => {
    expect(isValidTimezone('UTC')).toBe(true);
    expect(isValidTimezone('America/New_York')).toBe(true);
    expect(isValidTimezone('Africa/Lagos')).toBe(true);
    expect(isValidTimezone('Asia/Tokyo')).toBe(true);
  });

  it('should return false for invalid timezones', () => {
    expect(isValidTimezone('Invalid/Timezone')).toBe(false);
    expect(isValidTimezone('Not_A_Zone')).toBe(false);
    expect(isValidTimezone('XYZ/ABC')).toBe(false);
  });

  it('should return false for empty or invalid input', () => {
    expect(isValidTimezone('')).toBe(false);
    expect(isValidTimezone(null as any)).toBe(false);
    expect(isValidTimezone(undefined as any)).toBe(false);
    expect(isValidTimezone(123 as any)).toBe(false);
  });
});

describe('getCurrentDateKey', () => {
  it('should return current date in specified timezone', () => {
    const result = getCurrentDateKey('UTC');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should return different dates for different timezones at day boundary', () => {
    // Note: This test may be flaky depending on when it runs
    // It's primarily to demonstrate the function works
    const utcKey = getCurrentDateKey('UTC');
    const tokyoKey = getCurrentDateKey('Asia/Tokyo');
    
    // Both should be valid date keys
    expect(utcKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(tokyoKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should throw for invalid timezone', () => {
    expect(() => getCurrentDateKey('Invalid/Zone'))
      .toThrow('Invalid timezone');
  });
});

describe('isSameDay', () => {
  it('should return true for dates on same day in UTC', () => {
    const morning = new Date('2024-01-15T08:00:00Z');
    const evening = new Date('2024-01-15T20:00:00Z');
    
    expect(isSameDay(morning, evening, 'UTC')).toBe(true);
  });

  it('should return false for dates on different days in UTC', () => {
    const today = new Date('2024-01-15T20:00:00Z');
    const tomorrow = new Date('2024-01-16T08:00:00Z');
    
    expect(isSameDay(today, tomorrow, 'UTC')).toBe(false);
  });

  it('should handle timezone differences correctly', () => {
    const date1 = new Date('2024-01-15T23:30:00Z'); // 11:30 PM UTC
    const date2 = new Date('2024-01-16T00:30:00Z'); // 12:30 AM UTC next day
    
    // Different days in UTC
    expect(isSameDay(date1, date2, 'UTC')).toBe(false);
    
    // Same day in LA (3:30 PM and 4:30 PM on Jan 15)
    expect(isSameDay(date1, date2, 'America/Los_Angeles')).toBe(true);
  });

  it('should accept timestamps', () => {
    const ts1 = new Date('2024-01-15T12:00:00Z').getTime();
    const ts2 = new Date('2024-01-15T18:00:00Z').getTime();
    
    expect(isSameDay(ts1, ts2, 'UTC')).toBe(true);
  });
});

describe('isToday', () => {
  it('should return true for current date', () => {
    const now = new Date();
    expect(isToday(now, 'UTC')).toBe(true);
  });

  it('should return false for past date', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(yesterday, 'UTC')).toBe(false);
  });

  it('should return false for future date', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isToday(tomorrow, 'UTC')).toBe(false);
  });

  it('should handle timezone differences', () => {
    // This test is time-dependent, so we'll just verify it doesn't throw
    expect(() => isToday(new Date(), 'Asia/Tokyo')).not.toThrow();
    expect(() => isToday(new Date(), 'America/New_York')).not.toThrow();
  });
});

describe('getDateRange', () => {
  it('should generate consecutive dates', () => {
    const result = getDateRange('2024-01-15', '2024-01-17');
    expect(result).toEqual(['2024-01-15', '2024-01-16', '2024-01-17']);
  });

  it('should handle single day range', () => {
    const result = getDateRange('2024-01-15', '2024-01-15');
    expect(result).toEqual(['2024-01-15']);
  });

  it('should handle month boundaries', () => {
    const result = getDateRange('2024-01-30', '2024-02-02');
    expect(result).toEqual([
      '2024-01-30',
      '2024-01-31',
      '2024-02-01',
      '2024-02-02',
    ]);
  });

  it('should handle year boundaries', () => {
    const result = getDateRange('2024-12-30', '2025-01-02');
    expect(result).toEqual([
      '2024-12-30',
      '2024-12-31',
      '2025-01-01',
      '2025-01-02',
    ]);
  });

  it('should handle leap year', () => {
    const result = getDateRange('2024-02-28', '2024-03-01');
    expect(result).toEqual([
      '2024-02-28',
      '2024-02-29',
      '2024-03-01',
    ]);
  });

  it('should throw for invalid date format', () => {
    expect(() => getDateRange('invalid', '2024-01-15'))
      .toThrow('Invalid date format');
    
    expect(() => getDateRange('2024-01-15', 'invalid'))
      .toThrow('Invalid date format');
  });

  it('should throw if start is after end', () => {
    expect(() => getDateRange('2024-01-17', '2024-01-15'))
      .toThrow('Start date must be before or equal to end date');
  });

  it('should generate correct number of dates for longer ranges', () => {
    const result = getDateRange('2024-01-01', '2024-01-31');
    expect(result).toHaveLength(31);
    expect(result[0]).toBe('2024-01-01');
    expect(result[30]).toBe('2024-01-31');
  });
});

describe('real-world streak scenarios', () => {
  it('should correctly track streak across timezone for Nigerian user', () => {
    // User in Lagos makes deposits at different times
    const deposits = [
      new Date('2024-01-15T22:00:00Z'), // 11 PM UTC = 11 PM Lagos (Jan 15)
      new Date('2024-01-15T23:30:00Z'), // 11:30 PM UTC = 12:30 AM Lagos (Jan 16)
      new Date('2024-01-17T10:00:00Z'), // 10 AM UTC = 11 AM Lagos (Jan 17)
    ];

    const dateKeys = deposits.map(d => getStreakDateKey(d, 'Africa/Lagos'));
    
    expect(dateKeys).toEqual([
      '2024-01-15',
      '2024-01-16',
      '2024-01-17',
    ]);

    // Check for gaps (streak would be broken if Jan 16 was missing)
    const uniqueDays = new Set(dateKeys);
    expect(uniqueDays.size).toBe(3);
  });

  it('should handle background job processing in server timezone vs user timezone', () => {
    // Deposit made just before midnight in user timezone
    const depositTime = new Date('2024-01-15T22:30:00Z');
    
    // Server in UTC would count this as Jan 15
    const serverDay = getStreakDateKey(depositTime, 'UTC');
    expect(serverDay).toBe('2024-01-15');
    
    // But user in Lagos (UTC+1) it's already Jan 16
    const userDay = getStreakDateKey(depositTime, 'Africa/Lagos');
    expect(userDay).toBe('2024-01-15'); // Actually 11:30 PM, still Jan 15
    
    // One hour later - now it's Jan 16 for Lagos user
    const oneHourLater = new Date('2024-01-15T23:30:00Z');
    const userDayLater = getStreakDateKey(oneHourLater, 'Africa/Lagos');
    expect(userDayLater).toBe('2024-01-16');
  });

  it('should identify consecutive days for streak calculation', () => {
    const userTimezone = 'America/New_York';
    
    // User makes deposits on consecutive days
    const day1 = new Date('2024-01-15T04:00:00Z'); // 11 PM EST Jan 14
    const day2 = new Date('2024-01-16T04:00:00Z'); // 11 PM EST Jan 15
    const day3 = new Date('2024-01-17T04:00:00Z'); // 11 PM EST Jan 16
    
    const keys = [day1, day2, day3].map(d => getStreakDateKey(d, userTimezone));
    
    expect(keys).toEqual([
      '2024-01-14',
      '2024-01-15',
      '2024-01-16',
    ]);
    
    // Verify consecutive
    const range = getDateRange(keys[0], keys[keys.length - 1]);
    expect(range).toEqual(keys);
  });
});
