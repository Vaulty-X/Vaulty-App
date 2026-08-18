import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DisciplineScoreTrend } from './DisciplineScoreTrend';

describe('DisciplineScoreTrend', () => {
  it('shows the point difference when the score increased', () => {
    render(<DisciplineScoreTrend currentScore={85} previousScore={80} />);
    expect(screen.getByText('+5 points')).toBeInTheDocument();
    expect(screen.getByText('Discipline score increased by 5 points')).toBeInTheDocument();
  });

  it('shows the point difference when the score decreased', () => {
    render(<DisciplineScoreTrend currentScore={80} previousScore={85} />);
    expect(screen.getByText('-5 points')).toBeInTheDocument();
    expect(screen.getByText('Discipline score decreased by 5 points')).toBeInTheDocument();
  });

  it('shows no change when the score stays the same', () => {
    render(<DisciplineScoreTrend currentScore={80} previousScore={80} />);
    expect(screen.getByText('No change')).toBeInTheDocument();
    expect(screen.getByText('Discipline score unchanged')).toBeInTheDocument();
  });

  it('uses singular point for a difference of one', () => {
    const { rerender } = render(<DisciplineScoreTrend currentScore={81} previousScore={80} />);
    expect(screen.getByText('+1 point')).toBeInTheDocument();
    rerender(<DisciplineScoreTrend currentScore={80} previousScore={81} />);
    expect(screen.getByText('-1 point')).toBeInTheDocument();
  });

  it('provides an accessible label in every state', () => {
    const { rerender } = render(<DisciplineScoreTrend currentScore={85} previousScore={80} />);
    expect(screen.getByText('Discipline score increased by 5 points')).toBeInTheDocument();
    rerender(<DisciplineScoreTrend currentScore={80} previousScore={85} />);
    expect(screen.getByText('Discipline score decreased by 5 points')).toBeInTheDocument();
    rerender(<DisciplineScoreTrend currentScore={80} previousScore={80} />);
    expect(screen.getByText('Discipline score unchanged')).toBeInTheDocument();
  });

  it('avoids credit-score terminology', () => {
    render(<DisciplineScoreTrend currentScore={85} previousScore={80} />);
    expect(screen.queryByText(/credit|rating|upgrade|downgrade/i)).not.toBeInTheDocument();
  });
});