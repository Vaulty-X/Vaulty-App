'use client';

import { Check, Minus } from 'lucide-react';

export type DayStatus = 'saved' | 'missed' | 'current';

export interface WeekDay {
  date: Date;
  status: DayStatus;
}

interface WeeklyStreakCalendarProps {
  days: WeekDay[];
}

const statusLabel: Record<DayStatus, string> = {
  saved: 'Saved',
  missed: 'Missed',
  current: 'Today',
};

export function WeeklyStreakCalendar({ days }: WeeklyStreakCalendarProps) {
  return (
    <div className="card">
      <h3 className="text-sm font-medium mb-3">This Week</h3>
      {days.length === 0 ? (
        <p className="text-sm text-gray-500">No days to show</p>
      ) : (
        <>
          <ul className="grid grid-cols-7 gap-2">
            {days.map((day) => (
              <li
                key={day.date.getTime()}
                className={`flex flex-col items-center gap-1 rounded-lg p-2 ${
                  day.status === 'current'
                    ? 'bg-white ring-2 ring-primary-500'
                    : day.status === 'saved'
                    ? 'bg-green-50'
                    : 'bg-gray-100'
                }`}
                title={day.date.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              >
                <span className="text-xs text-gray-500">
                  {day.date.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className="text-lg font-semibold text-gray-800">
                  {day.date.getDate()}
                </span>
                {day.status === 'saved' ? (
                  <Check className="text-green-600" size={16} aria-hidden="true" />
                ) : day.status === 'missed' ? (
                  <Minus className="text-gray-400" size={16} aria-hidden="true" />
                ) : (
                  <span
                    className="w-2 h-2 rounded-full bg-primary-500"
                    aria-hidden="true"
                  />
                )}
                <span className="sr-only">
                  {statusLabel[day.status]},{' '}
                  {day.date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Check size={14} className="text-green-600" aria-hidden="true" />
              <span>Saved</span>
            </div>
            <div className="flex items-center gap-1">
              <Minus size={14} className="text-gray-400" aria-hidden="true" />
              <span>Missed</span>
            </div>
            <div className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full bg-primary-500"
                aria-hidden="true"
              />
              <span>Today</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}