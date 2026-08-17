'use client';

import { useState } from 'react';
import { Flame, Calendar, Snowflake } from 'lucide-react';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  streakFreezes: number;
  depositsThisMonth: number;
  consistency: number;
}

export function StreakTracker() {
  const [streakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    streakFreezes: 0,
    depositsThisMonth: 0,
    consistency: 0,
  });

  // Generate calendar grid (last 12 weeks)
  const generateCalendarGrid = () => {
    const weeks = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (i * 7) - today.getDay());
      
      const days = [];
      for (let j = 0; j < 7; j++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + j);
        days.push({
          date: day,
          hasDeposit: Math.random() > 0.7, // Mock data
          isToday: day.toDateString() === today.toDateString(),
        });
      }
      weeks.push(days);
    }
    
    return weeks;
  };

  const calendarWeeks = generateCalendarGrid();

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Savings Streak</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar size={16} />
          <span>Last 12 weeks</span>
        </div>
      </div>

      {/* Streak Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <Flame className="mx-auto mb-2 text-orange-500" size={24} />
          <div className="text-2xl font-bold text-orange-600">
            {streakData.currentStreak}
          </div>
          <div className="text-xs text-gray-600">Current Streak</div>
        </div>
        
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <Calendar className="mx-auto mb-2 text-blue-500" size={24} />
          <div className="text-2xl font-bold text-blue-600">
            {streakData.longestStreak}
          </div>
          <div className="text-xs text-gray-600">Longest Streak</div>
        </div>
        
        <div className="text-center p-3 bg-cyan-50 rounded-lg">
          <Snowflake className="mx-auto mb-2 text-cyan-500" size={24} />
          <div className="text-2xl font-bold text-cyan-600">
            {streakData.streakFreezes}
          </div>
          <div className="text-xs text-gray-600">Streak Freezes</div>
        </div>
        
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {streakData.consistency}%
          </div>
          <div className="text-xs text-gray-600">Consistency</div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-3">Savings Calendar</h3>
        <div className="overflow-x-auto">
          <div className="flex gap-1">
            {calendarWeeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={`w-3 h-3 rounded-sm ${
                      day.isToday
                        ? 'ring-2 ring-primary-500'
                        : day.hasDeposit
                        ? 'bg-green-500'
                        : 'bg-gray-200'
                    }`}
                    title={day.date.toLocaleDateString()}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-sm" />
            <span>Deposit</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-200 rounded-sm" />
            <span>No deposit</span>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div>
        <h3 className="text-sm font-medium mb-3">Milestones</h3>
        <div className="flex gap-2 flex-wrap">
          {[
            { days: 7, achieved: false },
            { days: 30, achieved: false },
            { days: 100, achieved: false },
            { days: 365, achieved: false },
          ].map((milestone) => (
            <div
              key={milestone.days}
              className={`px-3 py-1 rounded-full text-sm ${
                milestone.achieved
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {milestone.days} days
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
