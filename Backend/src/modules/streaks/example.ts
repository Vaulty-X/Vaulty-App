/**
 * Example Usage: Streak Date Key Utility
 * 
 * This file demonstrates practical usage of the streak date key utility
 * in various real-world scenarios within the Vaulty application.
 * 
 * Note: This is an example file with demo code, not production code.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  getStreakDateKey,
  isValidTimezone,
  getCurrentDateKey,
  isSameDay,
  getDateRange,
} from './streak-date-key';

// ============================================================================
// Example 1: Processing a User Deposit
// ============================================================================

interface DepositRequest {
  userId: string;
  vaultId: string;
  amount: number;
  timestamp: Date;
}

interface User {
  id: string;
  timezone: string;
}

async function processDeposit(deposit: DepositRequest, user: User) {
  console.log('Processing deposit for user in timezone:', user.timezone);
  
  // Generate date key based on user's timezone
  const dateKey = getStreakDateKey(deposit.timestamp, user.timezone);
  console.log('Deposit date key:', dateKey);
  
  // Store deposit with timezone-aware date key
  // await prisma.deposit.create({
  //   data: {
  //     userId: deposit.userId,
  //     vaultId: deposit.vaultId,
  //     amount: deposit.amount,
  //     timestamp: deposit.timestamp,
  //     dateKey, // YYYY-MM-DD in user's timezone
  //   },
  // });
  
  // Update streak for this day
  await updateStreakForDay(user.id, dateKey, user.timezone);
  
  return { success: true, dateKey };
}

// ============================================================================
// Example 2: Calculating Current Streak
// ============================================================================

interface Deposit {
  timestamp: Date;
  dateKey: string;
}

async function calculateCurrentStreak(userId: string, userTimezone: string): Promise<number> {
  // Fetch user's deposits (mocked for example)
  const deposits: Deposit[] = [
    { timestamp: new Date('2024-01-10T10:00:00Z'), dateKey: '2024-01-10' },
    { timestamp: new Date('2024-01-11T15:00:00Z'), dateKey: '2024-01-11' },
    { timestamp: new Date('2024-01-12T09:00:00Z'), dateKey: '2024-01-12' },
    { timestamp: new Date('2024-01-12T20:00:00Z'), dateKey: '2024-01-12' }, // Second deposit same day
    { timestamp: new Date('2024-01-13T11:00:00Z'), dateKey: '2024-01-13' },
    // Gap on Jan 14
    { timestamp: new Date('2024-01-15T10:00:00Z'), dateKey: '2024-01-15' },
    { timestamp: new Date('2024-01-16T10:00:00Z'), dateKey: '2024-01-16' },
  ];
  
  // Get unique deposit days (ignore multiple deposits per day)
  const depositDays = [...new Set(deposits.map(d => d.dateKey))].sort();
  console.log('Unique deposit days:', depositDays);
  
  // Get today's date key in user timezone
  const todayKey = getCurrentDateKey(userTimezone);
  console.log('Today:', todayKey);
  
  // Calculate streak working backwards from today
  let streak = 0;
  let currentDay = todayKey;
  
  // Check if there was a deposit today or yesterday (grace period)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getStreakDateKey(yesterday, userTimezone);
  
  if (!depositDays.includes(todayKey) && !depositDays.includes(yesterdayKey)) {
    console.log('No recent deposits - streak broken');
    return 0;
  }
  
  // Count consecutive days
  for (let i = depositDays.length - 1; i >= 0; i--) {
    const depositDay = depositDays[i];
    const daysBetween = dateDifference(depositDay, i > 0 ? depositDays[i - 1] : depositDay);
    
    if (daysBetween === 1) {
      streak++;
    } else if (daysBetween > 1) {
      // Gap in streak
      streak++;
      break;
    } else {
      streak++;
    }
  }
  
  console.log('Current streak:', streak);
  return streak;
}

// ============================================================================
// Example 3: Streak Reminder Notification Job
// ============================================================================

async function sendStreakReminders() {
  console.log('Running streak reminder job...');
  
  // Get users who haven't deposited today (mocked)
  const usersWithoutDeposit = [
    { id: 'user1', email: 'user1@example.com', timezone: 'Africa/Lagos', currentStreak: 5 },
    { id: 'user2', email: 'user2@example.com', timezone: 'America/New_York', currentStreak: 12 },
  ];
  
  for (const user of usersWithoutDeposit) {
    const todayKey = getCurrentDateKey(user.timezone);
    
    // Check if they've already deposited today
    const hasDepositedToday = await checkDepositForDay(user.id, todayKey);
    
    if (!hasDepositedToday) {
      console.log(`Sending reminder to ${user.email} (Streak: ${user.currentStreak})`);
      // await sendEmail(user.email, 'Don\'t break your streak!');
    }
  }
}

// ============================================================================
// Example 4: Validating Timezone on User Registration
// ============================================================================

interface RegistrationData {
  email: string;
  password: string;
  timezone: string;
}

function validateRegistration(data: RegistrationData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate timezone
  if (!data.timezone) {
    errors.push('Timezone is required');
  } else if (!isValidTimezone(data.timezone)) {
    errors.push('Invalid timezone. Please provide a valid IANA timezone (e.g., Africa/Lagos, America/New_York)');
  }
  
  // Other validations...
  if (!data.email) {
    errors.push('Email is required');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Example 5: Checking for Streak Gaps
// ============================================================================

function findStreakGaps(depositDays: string[]): { hasGaps: boolean; gaps: string[][] } {
  if (depositDays.length < 2) {
    return { hasGaps: false, gaps: [] };
  }
  
  const sorted = [...depositDays].sort();
  const gaps: string[][] = [];
  
  for (let i = 1; i < sorted.length; i++) {
    const prevDay = sorted[i - 1];
    const currentDay = sorted[i];
    
    // Get all days between these two dates
    const range = getDateRange(prevDay, currentDay);
    
    // If there are more than 2 days (start and end), there's a gap
    if (range.length > 2) {
      // Get the missing days (exclude start and end)
      const missingDays = range.slice(1, -1);
      gaps.push(missingDays);
    }
  }
  
  return {
    hasGaps: gaps.length > 0,
    gaps,
  };
}

// ============================================================================
// Example 6: Comparing Deposits Across Timezones
// ============================================================================

function compareDepositsAcrossTimezones() {
  const depositTime = new Date('2024-01-15T23:30:00Z'); // 11:30 PM UTC
  
  console.log('\nDeposit made at:', depositTime.toISOString());
  console.log('Date keys in different timezones:');
  
  const timezones = [
    'UTC',
    'Africa/Lagos',       // UTC+1
    'America/New_York',   // UTC-5
    'Asia/Tokyo',         // UTC+9
    'Australia/Sydney',   // UTC+11
  ];
  
  timezones.forEach(tz => {
    const dateKey = getStreakDateKey(depositTime, tz);
    console.log(`  ${tz.padEnd(20)} => ${dateKey}`);
  });
  
  // Show how two users in different timezones see different dates
  const user1Timezone = 'America/Los_Angeles'; // UTC-8
  const user2Timezone = 'Asia/Tokyo';          // UTC+9
  
  const earlyMorningUTC = new Date('2024-01-16T02:00:00Z'); // 2 AM UTC
  
  console.log('\nDeposit at 2 AM UTC on Jan 16:');
  console.log(`  LA user sees:    ${getStreakDateKey(earlyMorningUTC, user1Timezone)}`); // Jan 15
  console.log(`  Tokyo user sees: ${getStreakDateKey(earlyMorningUTC, user2Timezone)}`);  // Jan 16
}

// ============================================================================
// Example 7: Daily Streak Calculation Job
// ============================================================================

async function dailyStreakCalculationJob() {
  console.log('\n=== Running Daily Streak Calculation Job ===');
  
  // Mocked user data
  const users = [
    { id: 'user1', timezone: 'Africa/Lagos' },
    { id: 'user2', timezone: 'America/New_York' },
  ];
  
  for (const user of users) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = getStreakDateKey(yesterday, user.timezone);
    
    console.log(`\nProcessing user ${user.id} (${user.timezone})`);
    console.log(`Checking for deposit on: ${yesterdayKey}`);
    
    // Check if user made a deposit yesterday
    const hadDeposit = await checkDepositForDay(user.id, yesterdayKey);
    
    if (hadDeposit) {
      console.log('✅ Deposit found - maintaining streak');
      // await incrementStreak(user.id);
    } else {
      console.log('❌ No deposit - streak broken');
      // await resetStreak(user.id);
    }
  }
}

// ============================================================================
// Helper Functions (Mocked for examples)
// ============================================================================

async function updateStreakForDay(userId: string, dateKey: string, timezone: string) {
  console.log(`Updating streak for user ${userId} on ${dateKey}`);
  // Implementation would update database
}

async function checkDepositForDay(userId: string, dateKey: string): Promise<boolean> {
  // Mock implementation - would query database
  return Math.random() > 0.5;
}

function dateDifference(date1: string, date2: string): number {
  const d1 = new Date(date1 + 'T00:00:00Z');
  const d2 = new Date(date2 + 'T00:00:00Z');
  const diffTime = Math.abs(d1.getTime() - d2.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// ============================================================================
// Run Examples
// ============================================================================

async function runExamples() {
  console.log('=== Streak Date Key Utility Examples ===\n');
  
  // Example 1: Process deposit
  console.log('--- Example 1: Processing Deposit ---');
  const user: User = { id: 'user123', timezone: 'Africa/Lagos' };
  const deposit: DepositRequest = {
    userId: 'user123',
    vaultId: 'vault456',
    amount: 1000,
    timestamp: new Date('2024-01-15T23:30:00Z'),
  };
  await processDeposit(deposit, user);
  
  // Example 2: Calculate streak
  console.log('\n--- Example 2: Calculate Current Streak ---');
  await calculateCurrentStreak('user123', 'Africa/Lagos');
  
  // Example 3: Validate registration
  console.log('\n--- Example 3: Validate Registration ---');
  const registrationData: RegistrationData = {
    email: 'user@example.com',
    password: 'password123',
    timezone: 'Africa/Lagos',
  };
  const validation = validateRegistration(registrationData);
  console.log('Validation result:', validation);
  
  // Example 4: Find streak gaps
  console.log('\n--- Example 4: Find Streak Gaps ---');
  const depositDays = ['2024-01-10', '2024-01-11', '2024-01-15', '2024-01-16'];
  const gapResult = findStreakGaps(depositDays);
  console.log('Has gaps:', gapResult.hasGaps);
  console.log('Missing days:', gapResult.gaps);
  
  // Example 5: Compare across timezones
  console.log('\n--- Example 5: Compare Across Timezones ---');
  compareDepositsAcrossTimezones();
  
  // Example 6: Daily job
  console.log('\n--- Example 6: Daily Streak Job ---');
  await dailyStreakCalculationJob();
}

// Uncomment to run examples:
// runExamples().catch(console.error);

export {
  processDeposit,
  calculateCurrentStreak,
  validateRegistration,
  findStreakGaps,
  compareDepositsAcrossTimezones,
  dailyStreakCalculationJob,
};
