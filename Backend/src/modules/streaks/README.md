# Streak Date Key Module

## Overview

This module provides timezone-aware date key generation for streak tracking in the Vaulty application. It ensures that user deposits are counted on the correct day based on their timezone, preventing streak calculation errors that could occur when server and user timezones differ.

## Problem Statement

Without timezone-aware date handling:
- A deposit made at 11 PM in Lagos (UTC+1) could be counted as the next day if the server uses UTC
- Background jobs calculating streaks might use different timezones than the API, causing inconsistent results
- Day boundaries would be unclear, unfairly affecting user streaks

## Solution

The `streak-date-key` utility provides a shared helper that:
- ✅ Creates consistent YYYY-MM-DD keys from dates and timezones
- ✅ Handles day-boundary transitions correctly across all timezones
- ✅ Validates and safely handles invalid timezones
- ✅ Uses native JavaScript `Intl` API (no external dependencies)
- ✅ Comprehensively tested with 48 test cases

## Installation

No additional dependencies required - uses native Node.js `Intl` API.

```bash
npm install  # Installs existing dependencies
```

## Usage

### Basic Usage

```typescript
import { getStreakDateKey } from './modules/streaks/streak-date-key';

// Get date key for a specific date and timezone
const depositTime = new Date('2024-01-15T23:30:00Z');
const dateKey = getStreakDateKey(depositTime, 'Africa/Lagos');
// Returns: '2024-01-16' (next day in Lagos timezone)
```

### API Endpoint Example

```typescript
import { getStreakDateKey } from './modules/streaks/streak-date-key';

app.post('/api/v1/vaults/:vaultId/deposit', async (req, res) => {
  const { amount } = req.body;
  const { timezone } = req.user; // User's timezone from profile
  
  const depositTime = new Date();
  const dateKey = getStreakDateKey(depositTime, timezone);
  
  // Store deposit with timezone-aware date key
  await prisma.deposit.create({
    data: {
      vaultId: req.params.vaultId,
      amount,
      timestamp: depositTime,
      dateKey, // YYYY-MM-DD in user's timezone
    },
  });
  
  // Update streak
  await updateUserStreak(req.user.id, dateKey, timezone);
  
  res.json({ success: true, dateKey });
});
```

### Background Job Example

```typescript
import { getStreakDateKey, getDateRange } from './modules/streaks/streak-date-key';

// BullMQ job for calculating streaks
async function calculateStreakJob(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const deposits = await prisma.deposit.findMany({
    where: { userId },
    orderBy: { timestamp: 'asc' },
  });
  
  // Convert all deposits to date keys in user's timezone
  const depositDays = deposits.map(d => 
    getStreakDateKey(d.timestamp, user.timezone)
  );
  
  // Remove duplicates (multiple deposits same day)
  const uniqueDays = [...new Set(depositDays)];
  
  // Calculate streak
  let currentStreak = 0;
  let lastDay = null;
  
  for (const day of uniqueDays) {
    if (!lastDay || isConsecutiveDay(lastDay, day)) {
      currentStreak++;
    } else {
      currentStreak = 1;
    }
    lastDay = day;
  }
  
  return currentStreak;
}
```

### Checking for Streak Gaps

```typescript
import { getDateRange } from './modules/streaks/streak-date-key';

// Check if user maintained their streak
function hasStreakGap(depositDays: string[]): boolean {
  if (depositDays.length < 2) return false;
  
  const sorted = [...depositDays].sort();
  const firstDay = sorted[0];
  const lastDay = sorted[sorted.length - 1];
  
  // Get all days that should have deposits
  const expectedDays = getDateRange(firstDay, lastDay);
  
  // Check if any day is missing
  return expectedDays.some(day => !depositDays.includes(day));
}
```

## API Reference

### `getStreakDateKey(date, timezone)`

Generates a YYYY-MM-DD date key from a date and timezone.

**Parameters:**
- `date: Date | number` - The date to convert (Date object or timestamp)
- `timezone: string` - IANA timezone string (e.g., 'America/New_York', 'Africa/Lagos')

**Returns:** `string` - Date key in YYYY-MM-DD format

**Throws:** `Error` if timezone is invalid or date is invalid

**Example:**
```typescript
const key = getStreakDateKey(new Date('2024-01-15T23:30:00Z'), 'Africa/Lagos');
// Returns: '2024-01-16'
```

### `isValidTimezone(timezone)`

Validates if a timezone string is valid.

**Parameters:**
- `timezone: string` - IANA timezone string to validate

**Returns:** `boolean` - true if valid, false otherwise

**Example:**
```typescript
isValidTimezone('America/New_York'); // true
isValidTimezone('Invalid/Zone');     // false
```

### `getCurrentDateKey(timezone)`

Gets the current date key for a given timezone.

**Parameters:**
- `timezone: string` - IANA timezone string

**Returns:** `string` - Current date key in YYYY-MM-DD format

**Example:**
```typescript
const today = getCurrentDateKey('Africa/Lagos');
// Returns: '2024-01-16'
```

### `isSameDay(date1, date2, timezone)`

Checks if two dates fall on the same day in a given timezone.

**Parameters:**
- `date1: Date | number` - First date
- `date2: Date | number` - Second date
- `timezone: string` - IANA timezone string

**Returns:** `boolean` - true if dates are on the same day

**Example:**
```typescript
const morning = new Date('2024-01-15T08:00:00Z');
const evening = new Date('2024-01-15T20:00:00Z');
isSameDay(morning, evening, 'UTC'); // true
```

### `isToday(date, timezone)`

Checks if a date is today in a given timezone.

**Parameters:**
- `date: Date | number` - Date to check
- `timezone: string` - IANA timezone string

**Returns:** `boolean` - true if date is today

**Example:**
```typescript
isToday(new Date(), 'Africa/Lagos'); // true
```

### `getDateRange(startDate, endDate)`

Gets consecutive dates for a range (useful for streak calculations).

**Parameters:**
- `startDate: string` - Start date key (YYYY-MM-DD)
- `endDate: string` - End date key (YYYY-MM-DD)

**Returns:** `string[]` - Array of date keys in YYYY-MM-DD format

**Example:**
```typescript
getDateRange('2024-01-15', '2024-01-17');
// Returns: ['2024-01-15', '2024-01-16', '2024-01-17']
```

## Common Timezones

```typescript
// Nigeria
'Africa/Lagos'        // UTC+1

// United States
'America/New_York'    // UTC-5/-4 (EST/EDT)
'America/Chicago'     // UTC-6/-5 (CST/CDT)
'America/Denver'      // UTC-7/-6 (MST/MDT)
'America/Los_Angeles' // UTC-8/-7 (PST/PDT)

// Europe
'Europe/London'       // UTC+0/+1 (GMT/BST)
'Europe/Paris'        // UTC+1/+2 (CET/CEST)

// Asia
'Asia/Tokyo'          // UTC+9
'Asia/Shanghai'       // UTC+8
'Asia/Dubai'          // UTC+4

// UTC
'UTC'                 // UTC+0
```

## Edge Cases Handled

### Day Boundary Transitions
```typescript
// User in Lagos (UTC+1) makes deposit just before midnight UTC
const date = new Date('2024-01-15T22:59:00Z');
getStreakDateKey(date, 'Africa/Lagos'); // '2024-01-15' (11:59 PM Lagos)

// One minute later crosses the day boundary in Lagos
const nextMinute = new Date('2024-01-15T23:00:00Z');
getStreakDateKey(nextMinute, 'Africa/Lagos'); // '2024-01-16' (12:00 AM Lagos)
```

### Daylight Saving Time
```typescript
// DST transitions are handled automatically by Intl API
const dstDate = new Date('2024-03-10T06:00:00Z');
getStreakDateKey(dstDate, 'America/New_York'); // Correct date regardless of DST
```

### Invalid Inputs
```typescript
// Invalid timezone
try {
  getStreakDateKey(new Date(), 'Invalid/Zone');
} catch (error) {
  console.error(error.message); // "Invalid timezone: Invalid/Zone"
}

// Invalid date
try {
  getStreakDateKey(new Date('invalid'), 'UTC');
} catch (error) {
  console.error(error.message); // "Invalid date provided"
}
```

## Testing

Run the test suite:

```bash
npm test -- streak-date-key
```

The test suite includes 48 comprehensive tests covering:
- ✅ Basic functionality
- ✅ Day boundary transitions
- ✅ Daylight saving time transitions
- ✅ Timezone validation
- ✅ Input validation
- ✅ Month and year boundaries
- ✅ Real-world streak scenarios

## Best Practices

### 1. Always Use User's Timezone

```typescript
// ❌ BAD - Uses server timezone
const dateKey = getStreakDateKey(new Date(), 'UTC');

// ✅ GOOD - Uses user's timezone from their profile
const dateKey = getStreakDateKey(new Date(), user.timezone);
```

### 2. Store Timezone with User Profile

```typescript
// User model should include timezone
interface User {
  id: string;
  email: string;
  timezone: string; // 'Africa/Lagos', 'America/New_York', etc.
  // ... other fields
}
```

### 3. Validate Timezone on User Registration

```typescript
import { isValidTimezone } from './modules/streaks/streak-date-key';

app.post('/api/v1/auth/register', async (req, res) => {
  const { email, password, timezone } = req.body;
  
  if (!isValidTimezone(timezone)) {
    return res.status(400).json({
      error: 'Invalid timezone. Please provide a valid IANA timezone.',
    });
  }
  
  // Create user...
});
```

### 4. Consistent Date Key Usage

Always use the same timezone when generating date keys for a user:

```typescript
// ✅ GOOD - Consistent timezone usage
const depositKey = getStreakDateKey(depositTime, user.timezone);
const todayKey = getCurrentDateKey(user.timezone);

if (depositKey === todayKey) {
  // Deposit made today
}
```

### 5. Background Jobs Should Use User Timezone

```typescript
// BullMQ job
export async function processStreaks(userId: string) {
  const user = await getUser(userId);
  
  // ✅ Use user's timezone, not server timezone
  const todayKey = getCurrentDateKey(user.timezone);
  
  // Process streaks...
}
```

## Integration with Existing Code

### Database Schema

Add `dateKey` and `timezone` fields:

```sql
-- Add timezone to users table
ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';

-- Add dateKey to deposits table
ALTER TABLE deposits ADD COLUMN date_key VARCHAR(10);
CREATE INDEX idx_deposits_date_key ON deposits(user_id, date_key);

-- Add dateKey to streak_history table
CREATE TABLE streak_history (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  date_key VARCHAR(10) NOT NULL,
  had_deposit BOOLEAN DEFAULT false,
  streak_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date_key)
);
```

### Prisma Schema Example

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  timezone  String   @default("UTC")
  deposits  Deposit[]
  streaks   StreakHistory[]
}

model Deposit {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  amount     Decimal
  timestamp  DateTime @default(now())
  dateKey    String   // YYYY-MM-DD in user's timezone
  
  @@index([userId, dateKey])
}

model StreakHistory {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  dateKey     String
  hadDeposit  Boolean  @default(false)
  streakCount Int      @default(0)
  createdAt   DateTime @default(now())
  
  @@unique([userId, dateKey])
}
```

## Performance Considerations

- The `Intl.DateTimeFormat` API is highly optimized and suitable for production use
- Date key generation is O(1) operation
- Consider caching timezone validation results if validating frequently
- Index database queries by `dateKey` for efficient streak lookups

## License

MIT
