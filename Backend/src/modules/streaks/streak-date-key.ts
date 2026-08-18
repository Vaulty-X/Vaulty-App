/**
 * Streak Date Key Utility
 * 
 * Provides timezone-aware date key generation for streak tracking.
 * A day boundary depends on the user's timezone - this helper ensures
 * deposits are counted on the correct day regardless of server timezone.
 */

/**
 * Generates a YYYY-MM-DD date key from a date and timezone
 * 
 * @param date - The date to convert (Date object or timestamp)
 * @param timezone - IANA timezone string (e.g., 'America/New_York', 'Africa/Lagos')
 * @returns Date key in YYYY-MM-DD format
 * @throws Error if timezone is invalid
 * 
 * @example
 * // User in Lagos (UTC+1) makes deposit at 2024-01-15 23:30 UTC
 * getStreakDateKey(new Date('2024-01-15T23:30:00Z'), 'Africa/Lagos')
 * // Returns '2024-01-16' (next day in Lagos timezone)
 * 
 * @example
 * // User in New York (UTC-5) makes deposit at 2024-01-16 03:30 UTC
 * getStreakDateKey(new Date('2024-01-16T03:30:00Z'), 'America/New_York')
 * // Returns '2024-01-15' (previous day in New York timezone)
 */
export function getStreakDateKey(date: Date | number, timezone: string): string {
  // Validate inputs
  if (!date) {
    throw new Error('Date is required');
  }

  if (!timezone || typeof timezone !== 'string') {
    throw new Error('Timezone is required and must be a string');
  }

  // Convert to Date object if timestamp
  const dateObj = date instanceof Date ? date : new Date(date);

  // Validate date is valid
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid date provided');
  }

  // Validate timezone by attempting to use it
  try {
    // Use Intl.DateTimeFormat to format the date in the target timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    // en-CA locale gives us YYYY-MM-DD format directly
    const dateKey = formatter.format(dateObj);

    // Validate the output format (should be YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      throw new Error('Failed to generate valid date key format');
    }

    return dateKey;
  } catch (error) {
    // Invalid timezone will throw RangeError
    if (error instanceof RangeError) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }
    throw error;
  }
}

/**
 * Validates if a timezone string is valid
 * 
 * @param timezone - IANA timezone string to validate
 * @returns true if valid, false otherwise
 * 
 * @example
 * isValidTimezone('America/New_York') // true
 * isValidTimezone('Invalid/Zone') // false
 */
export function isValidTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== 'string') {
    return false;
  }

  try {
    // Attempt to create a DateTimeFormat with the timezone
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the current date key for a given timezone
 * 
 * @param timezone - IANA timezone string
 * @returns Current date key in YYYY-MM-DD format
 * @throws Error if timezone is invalid
 * 
 * @example
 * getCurrentDateKey('Africa/Lagos') // '2024-01-16'
 */
export function getCurrentDateKey(timezone: string): string {
  return getStreakDateKey(new Date(), timezone);
}

/**
 * Checks if two dates fall on the same day in a given timezone
 * 
 * @param date1 - First date
 * @param date2 - Second date
 * @param timezone - IANA timezone string
 * @returns true if dates are on the same day in the timezone
 * 
 * @example
 * const date1 = new Date('2024-01-15T23:30:00Z');
 * const date2 = new Date('2024-01-16T00:30:00Z');
 * isSameDay(date1, date2, 'UTC') // false
 * isSameDay(date1, date2, 'America/Los_Angeles') // true (both on Jan 15 in LA)
 */
export function isSameDay(
  date1: Date | number,
  date2: Date | number,
  timezone: string
): boolean {
  const key1 = getStreakDateKey(date1, timezone);
  const key2 = getStreakDateKey(date2, timezone);
  return key1 === key2;
}

/**
 * Checks if a date is today in a given timezone
 * 
 * @param date - Date to check
 * @param timezone - IANA timezone string
 * @returns true if date is today in the timezone
 */
export function isToday(date: Date | number, timezone: string): boolean {
  return isSameDay(date, new Date(), timezone);
}

/**
 * Gets consecutive dates for a range (useful for streak calculations)
 * 
 * @param startDate - Start date key (YYYY-MM-DD)
 * @param endDate - End date key (YYYY-MM-DD)
 * @returns Array of date keys in YYYY-MM-DD format
 * 
 * @example
 * getDateRange('2024-01-15', '2024-01-17')
 * // Returns ['2024-01-15', '2024-01-16', '2024-01-17']
 */
export function getDateRange(startDate: string, endDate: string): string[] {
  const start = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }

  if (start > end) {
    throw new Error('Start date must be before or equal to end date');
  }

  const dates: string[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(getStreakDateKey(current, 'UTC'));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}
