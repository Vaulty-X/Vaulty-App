import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VaultEmptyState } from './VaultEmptyState';

describe('VaultEmptyState', () => {
  it('explains vaults and offers to create one', () => {
    render(<VaultEmptyState onCreateVault={vi.fn()} />);

    expect(screen.getByText('Start saving toward a goal')).toBeInTheDocument();
    expect(
      screen.getByText(/a vault helps you save toward a goal/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create vault' })).toBeInTheDocument();
  });

  it('calls the create action when clicked', () => {
    const onCreateVault = vi.fn();
    render(<VaultEmptyState onCreateVault={onCreateVault} />);

    fireEvent.click(screen.getByRole('button', { name: 'Create vault' }));

    expect(onCreateVault).toHaveBeenCalledTimes(1);
  });
});