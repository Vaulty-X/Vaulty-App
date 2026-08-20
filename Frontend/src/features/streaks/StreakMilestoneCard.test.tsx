import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StreakMilestoneCard } from './StreakMilestoneCard';

describe('StreakMilestoneCard', () => {
  it('displays the current streak count', () => {
    render(<StreakMilestoneCard currentStreak={12} />);

    expect(screen.getByText('Current streak')).toBeInTheDocument();
    expect(screen.getByText('12 days')).toBeInTheDocument();
  });

  it('uses the singular day label when appropriate', () => {
    render(<StreakMilestoneCard currentStreak={6} />);

    expect(screen.getByText('1 day to go')).toBeInTheDocument();
  });

  it.each([
    { currentStreak: 0, milestone: 7 },
    { currentStreak: 7, milestone: 30 },
    { currentStreak: 30, milestone: 100 },
    { currentStreak: 100, milestone: 365 },
  ])(
    'shows $milestone days as the next milestone after a $currentStreak-day streak',
    ({ currentStreak, milestone }) => {
      render(<StreakMilestoneCard currentStreak={currentStreak} />);

      expect(screen.getByText('Next milestone')).toBeInTheDocument();
      expect(screen.getByText(`${milestone} days`)).toBeInTheDocument();
      expect(screen.getByText(`${milestone - currentStreak} days to go`)).toBeInTheDocument();
    }
  );

  it.each([365, 500])('shows the completed state for a %i-day streak', (currentStreak) => {
    render(<StreakMilestoneCard currentStreak={currentStreak} />);

    expect(screen.getByText('All milestones completed')).toBeInTheDocument();
    expect(screen.getByText('You reached the 365-day saving milestone.')).toBeInTheDocument();
    expect(screen.queryByText('Next milestone')).not.toBeInTheDocument();
  });
});
