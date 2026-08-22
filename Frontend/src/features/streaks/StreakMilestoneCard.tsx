import { CheckCircle2, Flame, Trophy } from 'lucide-react';

interface StreakMilestoneCardProps {
  currentStreak: number;
}

const MILESTONES = [7, 30, 100, 365] as const;

function formatDays(days: number) {
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

export function StreakMilestoneCard({ currentStreak }: StreakMilestoneCardProps) {
  const nextMilestone = MILESTONES.find((milestone) => milestone > currentStreak);

  return (
    <section className="card" aria-labelledby="streak-milestone-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 id="streak-milestone-title" className="text-sm font-medium text-gray-600">
            Current streak
          </h3>
          <p className="mt-1 flex items-center gap-2 text-3xl font-bold text-orange-600">
            <Flame aria-hidden="true" className="h-7 w-7" />
            {formatDays(currentStreak)}
          </p>
        </div>

        {nextMilestone === undefined ? (
          <CheckCircle2 aria-hidden="true" className="h-8 w-8 text-green-600" />
        ) : (
          <Trophy aria-hidden="true" className="h-8 w-8 text-amber-500" />
        )}
      </div>

      {nextMilestone === undefined ? (
        <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          <p className="font-semibold">All milestones completed</p>
          <p className="mt-1 text-sm">You reached the 365-day saving milestone.</p>
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Next milestone
          </p>
          <p className="mt-1 text-xl font-bold text-amber-900">
            {formatDays(nextMilestone)}
          </p>
          <p className="mt-1 text-sm text-amber-800">
            {formatDays(nextMilestone - currentStreak)} to go
          </p>
        </div>
      )}
    </section>
  );
}
