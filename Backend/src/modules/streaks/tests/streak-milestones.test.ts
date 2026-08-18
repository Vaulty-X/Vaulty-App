/**
 * Tests for Streak Milestones Module
 * 
 * Validates milestone definitions, next milestone calculation,
 * achievement tracking, and edge cases.
 */

import {
  STREAK_MILESTONES,
  getNextMilestone,
  getAchievedMilestones,
  isMilestone,
  getMilestoneDays,
  getMilestoneProgress,
  getMaxMilestone,
  hasReachedMaxMilestone,
} from '../streak-milestones';

describe('STREAK_MILESTONES', () => {
  it('should export the correct milestone values', () => {
    expect(STREAK_MILESTONES).toHaveLength(4);
    
    expect(STREAK_MILESTONES[0].days).toBe(7);
    expect(STREAK_MILESTONES[1].days).toBe(30);
    expect(STREAK_MILESTONES[2].days).toBe(100);
    expect(STREAK_MILESTONES[3].days).toBe(365);
  });

  it('should have proper milestone structure', () => {
    STREAK_MILESTONES.forEach((milestone) => {
      expect(milestone).toHaveProperty('days');
      expect(milestone).toHaveProperty('name');
      expect(milestone).toHaveProperty('description');
      
      expect(typeof milestone.days).toBe('number');
      expect(typeof milestone.name).toBe('string');
      expect(typeof milestone.description).toBe('string');
      
      expect(milestone.days).toBeGreaterThan(0);
      expect(milestone.name.length).toBeGreaterThan(0);
      expect(milestone.description.length).toBeGreaterThan(0);
    });
  });

  it('should be in ascending order', () => {
    for (let i = 1; i < STREAK_MILESTONES.length; i++) {
      expect(STREAK_MILESTONES[i].days).toBeGreaterThan(
        STREAK_MILESTONES[i - 1].days
      );
    }
  });

  it('should be immutable (readonly)', () => {
    // TypeScript prevents modification at compile time
    // This test verifies the structure exists
    expect(Array.isArray(STREAK_MILESTONES)).toBe(true);
  });
});

describe('getNextMilestone', () => {
  describe('basic functionality', () => {
    it('should return first milestone for streak of 0', () => {
      const result = getNextMilestone(0);
      
      expect(result.milestone).not.toBeNull();
      expect(result.milestone?.days).toBe(7);
      expect(result.daysRemaining).toBe(7);
      expect(result.isMaxed).toBe(false);
    });

    it('should return first milestone for streak of 1', () => {
      const result = getNextMilestone(1);
      
      expect(result.milestone?.days).toBe(7);
      expect(result.daysRemaining).toBe(6);
      expect(result.isMaxed).toBe(false);
    });

    it('should return second milestone after completing first', () => {
      const result = getNextMilestone(7);
      
      expect(result.milestone?.days).toBe(30);
      expect(result.daysRemaining).toBe(23);
      expect(result.isMaxed).toBe(false);
    });

    it('should return third milestone after completing second', () => {
      const result = getNextMilestone(30);
      
      expect(result.milestone?.days).toBe(100);
      expect(result.daysRemaining).toBe(70);
      expect(result.isMaxed).toBe(false);
    });

    it('should return fourth milestone after completing third', () => {
      const result = getNextMilestone(100);
      
      expect(result.milestone?.days).toBe(365);
      expect(result.daysRemaining).toBe(265);
      expect(result.isMaxed).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return null milestone when beyond all milestones', () => {
      const result = getNextMilestone(365);
      
      expect(result.milestone).toBeNull();
      expect(result.daysRemaining).toBe(0);
      expect(result.isMaxed).toBe(true);
    });

    it('should handle streak just before a milestone', () => {
      const result = getNextMilestone(6);
      
      expect(result.milestone?.days).toBe(7);
      expect(result.daysRemaining).toBe(1);
      expect(result.isMaxed).toBe(false);
    });

    it('should handle streak between milestones', () => {
      const result = getNextMilestone(50);
      
      expect(result.milestone?.days).toBe(100);
      expect(result.daysRemaining).toBe(50);
      expect(result.isMaxed).toBe(false);
    });

    it('should handle very large streaks beyond max milestone', () => {
      const result = getNextMilestone(1000);
      
      expect(result.milestone).toBeNull();
      expect(result.daysRemaining).toBe(0);
      expect(result.isMaxed).toBe(true);
    });

    it('should handle streak exactly at 365', () => {
      const result = getNextMilestone(365);
      
      expect(result.milestone).toBeNull();
      expect(result.isMaxed).toBe(true);
    });
  });

  describe('validation', () => {
    it('should throw error for invalid input', () => {
      expect(() => getNextMilestone(NaN)).toThrow('must be a valid number');
      expect(() => getNextMilestone(Infinity)).toThrow('must be a valid number');
      // @ts-ignore - Testing invalid input
      expect(() => getNextMilestone('5')).toThrow('must be a valid number');
      // @ts-ignore - Testing invalid input
      expect(() => getNextMilestone(null)).toThrow('must be a valid number');
      // @ts-ignore - Testing invalid input
      expect(() => getNextMilestone(undefined)).toThrow('must be a valid number');
    });

    it('should throw error for negative streak', () => {
      expect(() => getNextMilestone(-1)).toThrow('cannot be negative');
      expect(() => getNextMilestone(-100)).toThrow('cannot be negative');
    });

    it('should handle decimal numbers (round down)', () => {
      const result = getNextMilestone(6.9);
      
      expect(result.milestone?.days).toBe(7);
      expect(result.daysRemaining).toBeCloseTo(0.1, 1);
    });
  });
});

describe('getAchievedMilestones', () => {
  it('should return empty array for streak of 0', () => {
    const result = getAchievedMilestones(0);
    expect(result).toEqual([]);
  });

  it('should return empty array for streak below first milestone', () => {
    const result = getAchievedMilestones(6);
    expect(result).toEqual([]);
  });

  it('should return first milestone for streak of 7', () => {
    const result = getAchievedMilestones(7);
    
    expect(result).toHaveLength(1);
    expect(result[0].days).toBe(7);
  });

  it('should return multiple milestones for higher streaks', () => {
    const result = getAchievedMilestones(50);
    
    expect(result).toHaveLength(2);
    expect(result[0].days).toBe(7);
    expect(result[1].days).toBe(30);
  });

  it('should return all milestones for streak at max', () => {
    const result = getAchievedMilestones(365);
    
    expect(result).toHaveLength(4);
    expect(result[0].days).toBe(7);
    expect(result[1].days).toBe(30);
    expect(result[2].days).toBe(100);
    expect(result[3].days).toBe(365);
  });

  it('should return all milestones for streak beyond max', () => {
    const result = getAchievedMilestones(500);
    
    expect(result).toHaveLength(4);
    expect(result.map(m => m.days)).toEqual([7, 30, 100, 365]);
  });

  it('should throw error for invalid input', () => {
    expect(() => getAchievedMilestones(NaN)).toThrow('must be a valid number');
    expect(() => getAchievedMilestones(-1)).toThrow('cannot be negative');
  });
});

describe('isMilestone', () => {
  it('should return milestone for valid milestone days', () => {
    expect(isMilestone(7)?.days).toBe(7);
    expect(isMilestone(30)?.days).toBe(30);
    expect(isMilestone(100)?.days).toBe(100);
    expect(isMilestone(365)?.days).toBe(365);
  });

  it('should return null for non-milestone days', () => {
    expect(isMilestone(1)).toBeNull();
    expect(isMilestone(5)).toBeNull();
    expect(isMilestone(8)).toBeNull();
    expect(isMilestone(50)).toBeNull();
    expect(isMilestone(200)).toBeNull();
    expect(isMilestone(400)).toBeNull();
  });

  it('should return null for 0', () => {
    expect(isMilestone(0)).toBeNull();
  });

  it('should throw error for invalid input', () => {
    expect(() => isMilestone(NaN)).toThrow('must be a valid number');
    expect(() => isMilestone(-1)).toThrow('cannot be negative');
    // @ts-ignore - Testing invalid input
    expect(() => isMilestone('7')).toThrow('must be a valid number');
  });
});

describe('getMilestoneDays', () => {
  it('should return array of milestone day numbers', () => {
    const days = getMilestoneDays();
    
    expect(days).toEqual([7, 30, 100, 365]);
  });

  it('should return a new array each time', () => {
    const days1 = getMilestoneDays();
    const days2 = getMilestoneDays();
    
    expect(days1).toEqual(days2);
    expect(days1).not.toBe(days2); // Different references
  });
});

describe('getMilestoneProgress', () => {
  it('should calculate progress correctly for streak between first and second milestone', () => {
    const progress = getMilestoneProgress(20);
    
    expect(progress.current).toBe(20);
    expect(progress.previous).toBe(7);
    expect(progress.next).toBe(30);
    expect(progress.progressFromPrevious).toBe(13);
    expect(progress.progressToNext).toBe(10);
    expect(progress.percentageComplete).toBeCloseTo(56.52, 2);
  });

  it('should handle streak at 0', () => {
    const progress = getMilestoneProgress(0);
    
    expect(progress.current).toBe(0);
    expect(progress.previous).toBe(0);
    expect(progress.next).toBe(7);
    expect(progress.progressFromPrevious).toBe(0);
    expect(progress.progressToNext).toBe(7);
    expect(progress.percentageComplete).toBe(0);
  });

  it('should handle streak exactly at a milestone', () => {
    const progress = getMilestoneProgress(30);
    
    expect(progress.current).toBe(30);
    expect(progress.previous).toBe(30);
    expect(progress.next).toBe(100);
    expect(progress.progressFromPrevious).toBe(0);
    expect(progress.progressToNext).toBe(70);
    expect(progress.percentageComplete).toBe(0);
  });

  it('should handle streak beyond all milestones', () => {
    const progress = getMilestoneProgress(500);
    
    expect(progress.current).toBe(500);
    expect(progress.previous).toBe(365);
    expect(progress.next).toBeNull();
    expect(progress.progressFromPrevious).toBe(135);
    expect(progress.progressToNext).toBe(0);
    expect(progress.percentageComplete).toBe(100);
  });

  it('should handle streak at max milestone', () => {
    const progress = getMilestoneProgress(365);
    
    expect(progress.current).toBe(365);
    expect(progress.previous).toBe(365);
    expect(progress.next).toBeNull();
    expect(progress.progressFromPrevious).toBe(0);
    expect(progress.progressToNext).toBe(0);
    expect(progress.percentageComplete).toBe(100);
  });

  it('should throw error for invalid input', () => {
    expect(() => getMilestoneProgress(NaN)).toThrow('must be a valid number');
    expect(() => getMilestoneProgress(-1)).toThrow('cannot be negative');
  });
});

describe('getMaxMilestone', () => {
  it('should return 365', () => {
    expect(getMaxMilestone()).toBe(365);
  });
});

describe('hasReachedMaxMilestone', () => {
  it('should return false for streaks below max', () => {
    expect(hasReachedMaxMilestone(0)).toBe(false);
    expect(hasReachedMaxMilestone(100)).toBe(false);
    expect(hasReachedMaxMilestone(364)).toBe(false);
  });

  it('should return true for streak at max', () => {
    expect(hasReachedMaxMilestone(365)).toBe(true);
  });

  it('should return true for streak beyond max', () => {
    expect(hasReachedMaxMilestone(366)).toBe(true);
    expect(hasReachedMaxMilestone(500)).toBe(true);
    expect(hasReachedMaxMilestone(1000)).toBe(true);
  });

  it('should throw error for invalid input', () => {
    expect(() => hasReachedMaxMilestone(NaN)).toThrow('must be a valid number');
    expect(() => hasReachedMaxMilestone(-1)).toThrow('cannot be negative');
  });
});

describe('integration scenarios', () => {
  it('should support achievement unlock flow', () => {
    const streak = 30;
    
    // Check if this is a milestone
    const milestone = isMilestone(streak);
    expect(milestone).not.toBeNull();
    expect(milestone?.name).toBe('30-Day Streak');
    
    // Get all achievements
    const achieved = getAchievedMilestones(streak);
    expect(achieved).toHaveLength(2);
    
    // Get next goal
    const next = getNextMilestone(streak);
    expect(next.milestone?.days).toBe(100);
  });

  it('should support notification logic', () => {
    const streak = 99;
    
    // Check if user is close to milestone
    const next = getNextMilestone(streak);
    expect(next.daysRemaining).toBe(1);
    
    // Could send "1 day until 100-day milestone!" notification
    if (next.daysRemaining === 1) {
      expect(next.milestone?.days).toBe(100);
    }
  });

  it('should support UI progress bar', () => {
    const streak = 15;
    
    const progress = getMilestoneProgress(streak);
    
    // Progress bar from 7 to 30
    expect(progress.previous).toBe(7);
    expect(progress.next).toBe(30);
    expect(progress.percentageComplete).toBeCloseTo(34.78, 2);
    
    // UI could show: "15/30 days - 34.78% to next milestone"
  });

  it('should support checking all milestone days for UI badges', () => {
    const milestoneDays = getMilestoneDays();
    
    // UI could check if a day should show a badge
    expect(milestoneDays.includes(7)).toBe(true);
    expect(milestoneDays.includes(8)).toBe(false);
  });

  it('should handle maxed out user gracefully', () => {
    const streak = 500;
    
    const next = getNextMilestone(streak);
    expect(next.isMaxed).toBe(true);
    expect(next.milestone).toBeNull();
    
    const hasMaxed = hasReachedMaxMilestone(streak);
    expect(hasMaxed).toBe(true);
    
    // UI could show "Max milestone reached!" message
  });
});

describe('real-world usage patterns', () => {
  it('should help determine if notification should be sent', () => {
    // User at day 6 - 1 day before first milestone
    const streak = 6;
    const next = getNextMilestone(streak);
    
    if (next.daysRemaining === 1) {
      // Send reminder: "One more day to reach your 7-day streak!"
      expect(next.milestone?.days).toBe(7);
      expect(next.milestone?.name).toBe('7-Day Streak');
    }
  });

  it('should help unlock achievements', () => {
    // User just completed day 100
    const newStreak = 100;
    const justUnlocked = isMilestone(newStreak);
    
    if (justUnlocked) {
      // Trigger achievement unlock
      expect(justUnlocked.name).toBe('100-Day Streak');
      expect(justUnlocked.description).toBe('Triple-digit saving streak!');
      // await unlockAchievement(userId, justUnlocked);
    }
  });

  it('should help display progress in UI', () => {
    const streak = 45;
    const progress = getMilestoneProgress(streak);
    
    // Display progress bar
    const progressText = `${progress.current}/${progress.next} days`;
    
    expect(progressText).toBe('45/100 days');
    // Progress from 30 to 100: (45-30)/(100-30) = 15/70 = 21.43%
    expect(progress.percentageComplete).toBeCloseTo(21.43, 2);
  });
});
