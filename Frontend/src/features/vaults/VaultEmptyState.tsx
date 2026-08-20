'use client';

import { LockKeyhole } from 'lucide-react';

interface VaultEmptyStateProps {
  onCreateVault: () => void;
}

export function VaultEmptyState({ onCreateVault }: VaultEmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center sm:py-12">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-600">
        <LockKeyhole size={32} aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-lg font-medium">Start saving toward a goal</h3>
      <p className="mb-6 max-w-md text-gray-500">
        A vault helps you save toward a goal by keeping your money set aside until
        you are ready to use it.
      </p>
      <button onClick={onCreateVault} className="btn-primary">
        Create vault
      </button>
    </div>
  );
}