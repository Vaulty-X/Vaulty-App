import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VaultProgressBar } from './VaultProgressBar';

describe('VaultProgressBar', () => {
  it('calculates and exposes the current goal percentage', () => {
    render(<VaultProgressBar currentAmount={25} targetAmount={100} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('clamps progress above the target to 100%', () => {
    render(<VaultProgressBar currentAmount={125} targetAmount={100} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('Goal complete')).toBeInTheDocument();
  });

  it('clamps negative progress to 0%', () => {
    render(<VaultProgressBar currentAmount={-25} targetAmount={100} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('handles a zero target without producing invalid progress', () => {
    render(<VaultProgressBar currentAmount={0} targetAmount={0} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('No target set')).toBeInTheDocument();
  });
});