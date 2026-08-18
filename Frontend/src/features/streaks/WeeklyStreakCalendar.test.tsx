import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  WeeklyStreakCalendar,
  type DayStatus,
  type WeekDay,
} from './WeeklyStreakCalendar';

const days: WeekDay[] = [
  { date: new Date(2026, 7, 10), status: 'saved' },
  { date: new Date(2026, 7, 11), status: 'missed' },
  { date: new Date(2026, 7, 12), status: 'current' },
  { date: new Date(2026, 7, 13), status: 'saved' },
  { date: new Date(2026, 7, 14), status: 'missed' },
  { date: new Date(2026, 7, 15), status: 'saved' },
  { date: new Date(2026, 7, 16), status: 'saved' },
];

const statusLabel: Record<DayStatus, string> = {
  saved: 'Saved',
  missed: 'Missed',
  current: 'Today',
};

function dayLabel(status: DayStatus, date: Date) {
  return `${statusLabel[status]}, ${date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })}`;
}

describe('WeeklyStreakCalendar', () => {
  it('renders one cell per day', () => {
    render(<WeeklyStreakCalendar days={days} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
  });

  it('labels saved days', () => {
    render(<WeeklyStreakCalendar days={days} />);
    expect(screen.getByText(dayLabel('saved', days[0].date))).toBeInTheDocument();
    expect(screen.getAllByText(/^Saved,/)).toHaveLength(4);
  });

  it('labels missed days', () => {
    render(<WeeklyStreakCalendar days={days} />);
    expect(screen.getByText(dayLabel('missed', days[1].date))).toBeInTheDocument();
    expect(screen.getAllByText(/^Missed,/)).toHaveLength(2);
  });

  it('highlights the current day', () => {
    render(<WeeklyStreakCalendar days={days} />);
    expect(screen.getByText(dayLabel('current', days[2].date))).toBeInTheDocument();
  });

  it('gives every day an accessible label', () => {
    render(<WeeklyStreakCalendar days={days} />);
    const labels = screen.getAllByText(
      /(Saved|Missed|Today), [A-Z][a-z]{2},? [A-Z][a-z]{2} \d{1,2}/
    );
    expect(labels).toHaveLength(7);
  });

  it('shows a state indicator beyond color in every cell', () => {
    render(<WeeklyStreakCalendar days={days} />);
    const cells = screen.getAllByRole('listitem');
    for (const cell of cells) {
      const hasIcon = cell.querySelector('svg') !== null;
      const hasDot = cell.querySelector('span[class*="rounded-full"]') !== null;
      expect(hasIcon || hasDot).toBe(true);
    }
  });

  it('renders a legend for all three states', () => {
    render(<WeeklyStreakCalendar days={days} />);
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByText('Missed')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('handles an empty days array', () => {
    render(<WeeklyStreakCalendar days={[]} />);
    expect(screen.getByText('No days to show')).toBeInTheDocument();
  });
});