import { CheckCircle2, CircleDollarSign, Lock } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

export type VaultStatus = 'ACTIVE' | 'LOCKED' | 'CLOSED';

interface VaultStatusBadgeProps {
  status: VaultStatus;
}

interface StatusDetails {
  label: string;
  announcement: string;
  className: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const statusDetails: Record<VaultStatus, StatusDetails> = {
  ACTIVE: {
    label: 'Active',
    announcement: 'Vault status: Active. You can continue saving.',
    className: 'border-green-200 bg-green-50 text-green-700',
    Icon: CircleDollarSign,
  },
  LOCKED: {
    label: 'Locked',
    announcement: 'Vault status: Locked. Wait until maturity.',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    Icon: Lock,
  },
  CLOSED: {
    label: 'Closed',
    announcement: 'Vault status: Closed. This vault is complete.',
    className: 'border-gray-200 bg-gray-100 text-gray-700',
    Icon: CheckCircle2,
  },
};

export function VaultStatusBadge({ status }: VaultStatusBadgeProps) {
  const { label, announcement, className, Icon } = statusDetails[status];

  return (
    <span
      role="status"
      aria-label={announcement}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      <span aria-hidden="true">{label}</span>
    </span>
  );
}
