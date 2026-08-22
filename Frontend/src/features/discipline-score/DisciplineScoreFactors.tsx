'use client';

import { Flame, Target, RefreshCw, TrendingUp, BarChart2 } from 'lucide-react';

export interface ScoreFactor {
  id: string;
  label: string;
  description: string;
  value: number;
  maxValue: number;
  icon: React.ReactNode;
}

interface DisciplineScoreFactorsProps {
  factors?: ScoreFactor[];
  isLoading?: boolean;
}

function FactorRow({ factor }: { factor: ScoreFactor }) {
  const percentage = Math.min((factor.value / factor.maxValue) * 100, 100);

  const getBarColor = (pct: number) => {
    if (pct >= 75) return 'bg-green-500';
    if (pct >= 40) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  return (
    <div className="flex flex-col gap-1 py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-primary-600">{factor.icon}</span>
          <span className="font-medium text-gray-800">{factor.label}</span>
        </div>
        <span className="text-sm font-semibold text-gray-700">
          {factor.value}
          <span className="text-gray-400 font-normal"> / {factor.maxValue}</span>
        </span>
      </div>
      <p className="text-xs text-gray-500 ml-6">{factor.description}</p>
      <div className="ml-6 w-full bg-gray-100 rounded-full h-1.5 mt-1">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${getBarColor(percentage)}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={factor.value}
          aria-valuemin={0}
          aria-valuemax={factor.maxValue}
          aria-label={`${factor.label}: ${factor.value} out of ${factor.maxValue}`}
        />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div
      className="flex flex-col gap-2 py-3 border-b border-gray-100 last:border-b-0 animate-pulse"
      aria-hidden="true"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="w-32 h-4 bg-gray-200 rounded" />
        </div>
        <div className="w-12 h-4 bg-gray-200 rounded" />
      </div>
      <div className="ml-6 w-48 h-3 bg-gray-200 rounded" />
      <div className="ml-6 w-full h-1.5 bg-gray-200 rounded-full mt-1" />
    </div>
  );
}

export const DEFAULT_FACTORS: ScoreFactor[] = [
  {
    id: 'streak-consistency',
    label: 'Saving Consistency',
    description: 'How regularly you make deposits — streaks and missed days both count.',
    value: 0,
    maxValue: 30,
    icon: <Flame size={18} />,
  },
  {
    id: 'streak-length',
    label: 'Streak Length',
    description: 'The length of your current and longest saving streak.',
    value: 0,
    maxValue: 25,
    icon: <TrendingUp size={18} />,
  },
  {
    id: 'goal-completion',
    label: 'Goal Progress',
    description: 'Progress toward the savings goals you have set across your vaults.',
    value: 0,
    maxValue: 25,
    icon: <Target size={18} />,
  },
  {
    id: 'repayment-history',
    label: 'Repayment History',
    description: 'Your track record of repaying any borrowed amounts on time.',
    value: 0,
    maxValue: 10,
    icon: <RefreshCw size={18} />,
  },
  {
    id: 'investment-activity',
    label: 'Investment Activity',
    description: 'Engagement with yield vaults and investment portfolios.',
    value: 0,
    maxValue: 10,
    icon: <BarChart2 size={18} />,
  },
];

export function DisciplineScoreFactors({
  factors,
  isLoading = false,
}: DisciplineScoreFactorsProps) {
  if (isLoading) {
    return (
      <div className="card" aria-busy="true" aria-label="Loading score factors">
        <div className="flex justify-between items-center mb-4">
          <div className="w-40 h-5 bg-gray-200 rounded animate-pulse" />
          <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  const displayFactors = factors ?? DEFAULT_FACTORS;

  if (displayFactors.length === 0) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">What shapes your score</h2>
        <div className="text-center py-10">
          <div className="text-5xl mb-3">📋</div>
          <h3 className="text-base font-medium text-gray-700 mb-1">
            No factors to show yet
          </h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            Start saving, set goals, and make consistent deposits — your contributing
            factors will appear here as you build your habits.
          </p>
        </div>
      </div>
    );
  }

  const totalEarned = displayFactors.reduce((sum, f) => sum + f.value, 0);
  const totalPossible = displayFactors.reduce((sum, f) => sum + f.maxValue, 0);

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">What shapes your score</h2>
        <span className="text-sm font-medium text-primary-600">
          {totalEarned}
          <span className="text-gray-400 font-normal"> / {totalPossible} pts</span>
        </span>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Your discipline score reflects your saving habits — not a credit rating. Every
        factor below shows exactly how your score is built.
      </p>

      <div>
        {displayFactors.map((factor) => (
          <FactorRow key={factor.id} factor={factor} />
        ))}
      </div>
    </div>
  );
}
