/**
 * Streak Milestones Module
 * 
 * Centralizes streak milestone definitions for achievements, notifications, and UI features.
 * Defining milestones in one place prevents mismatched values and makes future changes
 * easy to review and maintain.
 */

/**
 * Milestone configuration
 */
export interface Milestone {
  days: number;
  name: string;
  description: string;
}

/**
 * Predefined streak milestones
 * These are used across achievement, notification, and UI features
 */
export const STREAK_MILESTONES: readonly Milestone[] = [
  {
    days: 7,
    name: '7-Day Streak',
    description: 'Saved for a full week!',
  },
  {
    days: 30,
    name: '30-Day Streak',
    description: 'A full month of consistent saving!',
  },
  {
    days: 100,
    name: '100-Day Streak',
    description: 'Triple-digit saving streak!',
  },
  {
    days: 365,
    name: '365-Day Streak',
    description: 'A full year of dedication!',
  },
] as const;

/**
 * Result returned when finding the next milestone
 */
export interface NextMilestoneResult {
  /** The next milestone to reach, or null if beyond all milestones */
  milestone: Milestone | null;
  /** Number of days remaining to reach the next milestone */
  daysRemaining: number;
  /** Whether the current streak has passed all milestones */
  isMaxed: boolean;
}

/**
 * Gets the next milestone for a given current streak
 * 
 * @param currentStreak - The user's current streak count
 * @returns Information about the next milestone to achieve
 * 
 * @example
 * getNextMilestone(5)
 * // Returns: { milestone: { days: 7, ... }, daysRemaining: 2, isMaxed: false }
 * 
 * @example
 * getNextMilestone(400)
 * // Returns: { milestone: null, daysRemaining: 0, isMaxed: true }
 */
export function getNextMilestone(currentStreak: number): NextMilestoneResult {
  // Validate input
  if (typeof currentStreak !== 'number' || isNaN(currentStreak) || !isFinite(currentStreak)) {
    throw new Error('Current streak must be a valid number');
  }

  if (currentStreak < 0) {
    throw new Error('Current streak cannot be negative');
  }

  // Find the first milestone that hasn't been reached yet
  const nextMilestone = STREAK_MILESTONES.find(
    (milestone) => milestone.days > currentStreak
  );

  if (nextMilestone) {
    // Found a milestone ahead
    return {
      milestone: nextMilestone,
      daysRemaining: nextMilestone.days - currentStreak,
      isMaxed: false,
    };
  }

  // No more milestones - user has passed all of them
  return {
    milestone: null,
    daysRemaining: 0,
    isMaxed: true,
  };
}

/**
 * Gets all milestones that have been achieved for a given streak
 * 
 * @param currentStreak - The user's current streak count
 * @returns Array of achieved milestones
 * 
 * @example
 * getAchievedMilestones(35)
 * // Returns: [{ days: 7, ... }, { days: 30, ... }]
 */
export function getAchievedMilestones(currentStreak: number): Milestone[] {
  if (typeof currentStreak !== 'number' || isNaN(currentStreak)) {
    throw new Error('Current streak must be a valid number');
  }

  if (currentStreak < 0) {
    throw new Error('Current streak cannot be negative');
  }

  return STREAK_MILESTONES.filter(
    (milestone) => milestone.days <= currentStreak
  );
}

/**
 * Checks if a specific streak day is a milestone
 * 
 * @param streakDay - The streak day to check
 * @returns The milestone if the day is a milestone, null otherwise
 * 
 * @example
 * isMilestone(7)  // Returns: { days: 7, name: '7-Day Streak', ... }
 * isMilestone(8)  // Returns: null
 */
export function isMilestone(streakDay: number): Milestone | null {
  if (typeof streakDay !== 'number' || isNaN(streakDay)) {
    throw new Error('Streak day must be a valid number');
  }

  if (streakDay < 0) {
    throw new Error('Streak day cannot be negative');
  }

  const milestone = STREAK_MILESTONES.find((m) => m.days === streakDay);
  return milestone || null;
}

/**
 * Gets all milestone day numbers as an array
 * Useful for checking if a day is a milestone or for UI rendering
 * 
 * @returns Array of milestone day numbers [7, 30, 100, 365]
 * 
 * @example
 * getMilestoneDays() // Returns: [7, 30, 100, 365]
 */
export function getMilestoneDays(): number[] {
  return STREAK_MILESTONES.map((m) => m.days);
}

/**
 * Gets progress information towards the next milestone
 * 
 * @param currentStreak - The user's current streak count
 * @returns Progress information including percentage
 * 
 * @example
 * getMilestoneProgress(20)
 * // Returns: {
 * //   current: 20,
 * //   next: 30,
 * //   previous: 7,
 * //   progressFromPrevious: 13,
 * //   progressToNext: 10,
 * //   percentageComplete: 56.52
 * // }
 */
export function getMilestoneProgress(currentStreak: number): {
  current: number;
  next: number | null;
  previous: number | null;
  progressFromPrevious: number;
  progressToNext: number;
  percentageComplete: number;
} {
  if (typeof currentStreak !== 'number' || isNaN(currentStreak)) {
    throw new Error('Current streak must be a valid number');
  }

  if (currentStreak < 0) {
    throw new Error('Current streak cannot be negative');
  }

  const achievedMilestones = getAchievedMilestones(currentStreak);
  const nextMilestoneResult = getNextMilestone(currentStreak);

  const previousMilestone =
    achievedMilestones.length > 0
      ? achievedMilestones[achievedMilestones.length - 1]
      : null;

  const previous = previousMilestone ? previousMilestone.days : 0;
  const next = nextMilestoneResult.milestone
    ? nextMilestoneResult.milestone.days
    : null;

  const progressFromPrevious = currentStreak - previous;
  const progressToNext = next ? next - currentStreak : 0;

  // Calculate percentage: how far between previous and next milestone
  let percentageComplete = 0;
  if (next !== null) {
    const totalDistance = next - previous;
    percentageComplete = (progressFromPrevious / totalDistance) * 100;
  } else {
    // Maxed out - 100%
    percentageComplete = 100;
  }

  return {
    current: currentStreak,
    next,
    previous,
    progressFromPrevious,
    progressToNext,
    percentageComplete: Math.round(percentageComplete * 100) / 100, // Round to 2 decimals
  };
}

/**
 * Gets the largest milestone day value
 * 
 * @returns The maximum milestone day (365)
 */
export function getMaxMilestone(): number {
  return STREAK_MILESTONES[STREAK_MILESTONES.length - 1].days;
}

/**
 * Checks if a streak has reached the maximum milestone
 * 
 * @param currentStreak - The user's current streak count
 * @returns True if the streak has reached or exceeded the max milestone
 */
export function hasReachedMaxMilestone(currentStreak: number): boolean {
  if (typeof currentStreak !== 'number' || isNaN(currentStreak)) {
    throw new Error('Current streak must be a valid number');
  }

  if (currentStreak < 0) {
    throw new Error('Current streak cannot be negative');
  }

  return currentStreak >= getMaxMilestone();
}
