'use client';

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

interface DisciplineScoreTrendProps {
  currentScore: number;
  previousScore: number;
}

export function DisciplineScoreTrend({ currentScore, previousScore }: DisciplineScoreTrendProps) {
  const difference = currentScore - previousScore;

  if (difference > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-sm font-medium text-green-700">
        <TrendingUp size={14} aria-hidden="true" />
        +{difference} point{difference === 1 ? '' : 's'}
        <span className="sr-only">
          Discipline score increased by {difference} point{difference === 1 ? '' : 's'}
        </span>
      </span>
    );
  }

  if (difference < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-sm font-medium text-red-700">
        <TrendingDown size={14} aria-hidden="true" />
        {difference} point{difference === -1 ? '' : 's'}
        <span className="sr-only">
          Discipline score decreased by {Math.abs(difference)} point{Math.abs(difference) === 1 ? '' : 's'}
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-sm font-medium text-gray-600">
      <Minus size={14} aria-hidden="true" />
      No change
      <span className="sr-only">Discipline score unchanged</span>
    </span>
  );
}