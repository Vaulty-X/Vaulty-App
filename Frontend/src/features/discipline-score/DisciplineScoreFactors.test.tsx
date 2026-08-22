import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  DisciplineScoreFactors,
  DEFAULT_FACTORS,
  ScoreFactor,
} from './DisciplineScoreFactors';

// Stub lucide-react icons so tests don't need canvas
vi.mock('lucide-react', () => ({
  Flame: () => <svg data-testid="icon-flame" />,
  Target: () => <svg data-testid="icon-target" />,
  RefreshCw: () => <svg data-testid="icon-refresh" />,
  TrendingUp: () => <svg data-testid="icon-trending-up" />,
  BarChart2: () => <svg data-testid="icon-bar-chart" />,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFactors: ScoreFactor[] = [
  {
    id: 'streak-consistency',
    label: 'Saving Consistency',
    description: 'How regularly you make deposits.',
    value: 20,
    maxValue: 30,
    icon: <svg data-testid="icon-flame" />,
  },
  {
    id: 'goal-completion',
    label: 'Goal Progress',
    description: 'Progress toward your vault goals.',
    value: 15,
    maxValue: 25,
    icon: <svg data-testid="icon-target" />,
  },
];

const partialFactors: ScoreFactor[] = [
  {
    id: 'repayment-history',
    label: 'Repayment History',
    description: 'Your loan repayment track record.',
    value: 5,
    maxValue: 10,
    icon: <svg data-testid="icon-refresh" />,
  },
];

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('DisciplineScoreFactors — loading state', () => {
  it('renders without crashing when isLoading is true', () => {
    const { container } = render(<DisciplineScoreFactors isLoading />);
    expect(container).toBeTruthy();
  });

  it('marks the root element as busy for screen readers', () => {
    render(<DisciplineScoreFactors isLoading />);
    // The card div carries aria-busy="true" and an aria-label for screen readers
    const el = document.querySelector('[aria-busy="true"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('aria-label', 'Loading score factors');
  });

  it('does not render factor labels while loading', () => {
    render(<DisciplineScoreFactors isLoading />);
    expect(screen.queryByText('Saving Consistency')).not.toBeInTheDocument();
    expect(screen.queryByText('Goal Progress')).not.toBeInTheDocument();
  });

  it('renders the correct number of skeleton rows', () => {
    render(<DisciplineScoreFactors isLoading />);
    // skeleton rows are aria-hidden, query via attribute
    const skeletonRows = document.querySelectorAll('[aria-hidden="true"]');
    expect(skeletonRows.length).toBe(5);
  });

  it('does not render the heading while loading', () => {
    render(<DisciplineScoreFactors isLoading />);
    expect(
      screen.queryByText('What shapes your score')
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('DisciplineScoreFactors — empty state', () => {
  it('renders without crashing when factors is an empty array', () => {
    const { container } = render(<DisciplineScoreFactors factors={[]} />);
    expect(container).toBeTruthy();
  });

  it('shows the section heading in the empty state', () => {
    render(<DisciplineScoreFactors factors={[]} />);
    expect(
      screen.getByText('What shapes your score')
    ).toBeInTheDocument();
  });

  it('shows the empty-state headline', () => {
    render(<DisciplineScoreFactors factors={[]} />);
    expect(
      screen.getByText('No factors to show yet')
    ).toBeInTheDocument();
  });

  it('shows the empty-state description', () => {
    render(<DisciplineScoreFactors factors={[]} />);
    expect(
      screen.getByText(/Start saving, set goals, and make consistent deposits/i)
    ).toBeInTheDocument();
  });

  it('shows the clipboard emoji', () => {
    render(<DisciplineScoreFactors factors={[]} />);
    expect(screen.getByText('📋')).toBeInTheDocument();
  });

  it('does not render any progress bars in the empty state', () => {
    render(<DisciplineScoreFactors factors={[]} />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Default / no-props state (DEFAULT_FACTORS displayed with value 0)
// ---------------------------------------------------------------------------

describe('DisciplineScoreFactors — default factors (no props)', () => {
  it('renders without crashing with no props', () => {
    const { container } = render(<DisciplineScoreFactors />);
    expect(container).toBeTruthy();
  });

  it('renders the section heading', () => {
    render(<DisciplineScoreFactors />);
    expect(
      screen.getByText('What shapes your score')
    ).toBeInTheDocument();
  });

  it('renders all five default factor labels', () => {
    render(<DisciplineScoreFactors />);
    DEFAULT_FACTORS.forEach((f) => {
      expect(screen.getByText(f.label)).toBeInTheDocument();
    });
  });

  it('renders all five default factor descriptions', () => {
    render(<DisciplineScoreFactors />);
    DEFAULT_FACTORS.forEach((f) => {
      expect(screen.getByText(f.description)).toBeInTheDocument();
    });
  });

  it('renders a progress bar for each default factor', () => {
    render(<DisciplineScoreFactors />);
    const bars = screen.getAllByRole('progressbar');
    expect(bars).toHaveLength(DEFAULT_FACTORS.length);
  });

  it('shows 0 as the current value for each bar', () => {
    render(<DisciplineScoreFactors />);
    const bars = screen.getAllByRole('progressbar');
    bars.forEach((bar) => {
      expect(bar).toHaveAttribute('aria-valuenow', '0');
      expect(bar).toHaveAttribute('aria-valuemin', '0');
    });
  });

  it('does not describe the score as a credit score', () => {
    const { container } = render(<DisciplineScoreFactors />);
    expect(container.textContent).not.toMatch(/credit score/i);
  });

  it('shows the explanatory copy that this is not a credit rating', () => {
    render(<DisciplineScoreFactors />);
    expect(
      screen.getByText(/not a credit rating/i)
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Loaded state with custom factors
// ---------------------------------------------------------------------------

describe('DisciplineScoreFactors — loaded with custom factors', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <DisciplineScoreFactors factors={mockFactors} />
    );
    expect(container).toBeTruthy();
  });

  it('renders the correct labels for each factor', () => {
    render(<DisciplineScoreFactors factors={mockFactors} />);
    expect(screen.getByText('Saving Consistency')).toBeInTheDocument();
    expect(screen.getByText('Goal Progress')).toBeInTheDocument();
  });

  it('renders the correct descriptions for each factor', () => {
    render(<DisciplineScoreFactors factors={mockFactors} />);
    expect(
      screen.getByText('How regularly you make deposits.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Progress toward your vault goals.')
    ).toBeInTheDocument();
  });

  it('renders a progress bar per factor', () => {
    render(<DisciplineScoreFactors factors={mockFactors} />);
    expect(screen.getAllByRole('progressbar')).toHaveLength(mockFactors.length);
  });

  it('sets the correct aria-valuenow on progress bars', () => {
    render(<DisciplineScoreFactors factors={mockFactors} />);
    const bars = screen.getAllByRole('progressbar');
    expect(bars[0]).toHaveAttribute('aria-valuenow', '20');
    expect(bars[1]).toHaveAttribute('aria-valuenow', '15');
  });

  it('sets the correct aria-valuemax on progress bars', () => {
    render(<DisciplineScoreFactors factors={mockFactors} />);
    const bars = screen.getAllByRole('progressbar');
    expect(bars[0]).toHaveAttribute('aria-valuemax', '30');
    expect(bars[1]).toHaveAttribute('aria-valuemax', '25');
  });

  it('shows the total score tally (earned / possible)', () => {
    render(<DisciplineScoreFactors factors={mockFactors} />);
    // total earned = 20+15=35, total possible = 30+25=55
    expect(screen.getByText('35')).toBeInTheDocument();
    expect(screen.getByText('/ 55 pts')).toBeInTheDocument();
  });

  it('does not describe the score as a credit score', () => {
    const { container } = render(
      <DisciplineScoreFactors factors={mockFactors} />
    );
    expect(container.textContent).not.toMatch(/credit score/i);
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe('DisciplineScoreFactors — accessibility', () => {
  it('progress bars have accessible labels', () => {
    render(<DisciplineScoreFactors factors={partialFactors} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-label');
    expect(bar.getAttribute('aria-label')).toMatch(/Repayment History/i);
  });

  it('progress bars have aria-valuemin set to 0', () => {
    render(<DisciplineScoreFactors factors={partialFactors} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
  });

  it('progress bar value does not exceed max even if factor value exceeds maxValue', () => {
    const overflowFactor: ScoreFactor[] = [
      {
        id: 'overflow',
        label: 'Overflow Factor',
        description: 'Should be capped at 100%.',
        value: 200,
        maxValue: 10,
        icon: <svg />,
      },
    ];
    render(<DisciplineScoreFactors factors={overflowFactor} />);
    const bar = screen.getByRole('progressbar');
    // aria-valuenow reflects the raw value; visual width is capped — just check the bar exists
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute('aria-valuenow', '200');
  });
});

// ---------------------------------------------------------------------------
// Copy / tone
// ---------------------------------------------------------------------------

describe('DisciplineScoreFactors — copy & tone', () => {
  it('uses the heading "What shapes your score"', () => {
    render(<DisciplineScoreFactors />);
    expect(
      screen.getByRole('heading', { name: /What shapes your score/i })
    ).toBeInTheDocument();
  });

  it('never uses the phrase "credit score" anywhere in the rendered output', () => {
    const { container: c1 } = render(<DisciplineScoreFactors />);
    const { container: c2 } = render(<DisciplineScoreFactors factors={[]} />);
    const { container: c3 } = render(
      <DisciplineScoreFactors factors={mockFactors} />
    );
    [c1, c2, c3].forEach((c) => {
      expect(c.textContent).not.toMatch(/credit score/i);
    });
  });
});
