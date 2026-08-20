import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VaultStatusBadge, type VaultStatus } from './VaultStatusBadge';

const cases: Array<{
  status: VaultStatus;
  label: string;
  accessibleName: string;
  classes: string[];
}> = [
  {
    status: 'ACTIVE',
    label: 'Active',
    accessibleName: 'Vault status: Active. You can continue saving.',
    classes: ['border-green-200', 'bg-green-50', 'text-green-700'],
  },
  {
    status: 'LOCKED',
    label: 'Locked',
    accessibleName: 'Vault status: Locked. Wait until maturity.',
    classes: ['border-amber-200', 'bg-amber-50', 'text-amber-700'],
  },
  {
    status: 'CLOSED',
    label: 'Closed',
    accessibleName: 'Vault status: Closed. This vault is complete.',
    classes: ['border-gray-200', 'bg-gray-100', 'text-gray-700'],
  },
];

describe('VaultStatusBadge', () => {
  it.each(cases)('renders the $status state with a visible text label', ({ status, label }) => {
    render(<VaultStatusBadge status={status} />);

    expect(screen.getByText(label)).toBeVisible();
  });

  it.each(cases)('announces useful status text for $status', ({ status, accessibleName }) => {
    render(<VaultStatusBadge status={status} />);

    expect(screen.getByRole('status', { name: accessibleName })).toBeInTheDocument();
  });

  it.each(cases)('uses the $status visual treatment', ({ status, accessibleName, classes }) => {
    render(<VaultStatusBadge status={status} />);

    expect(screen.getByRole('status', { name: accessibleName })).toHaveClass(...classes);
  });

  it.each(cases)('includes a non-color icon for $status', ({ status, accessibleName }) => {
    render(<VaultStatusBadge status={status} />);

    const badge = screen.getByRole('status', { name: accessibleName });
    expect(badge.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
  });
});
