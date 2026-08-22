/**
 * Streaks Module
 * 
 * Provides utilities for timezone-aware streak tracking and milestone management
 */

// Milestone utilities
export {
  STREAK_MILESTONES,
  getNextMilestone,
  getAchievedMilestones,
  isMilestone,
  getMilestoneDays,
  getMilestoneProgress,
  getMaxMilestone,
  hasReachedMaxMilestone,
  type Milestone,
  type NextMilestoneResult,
} from './streak-milestones';
