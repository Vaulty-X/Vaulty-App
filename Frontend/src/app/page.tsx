'use client';

import { WalletConnect } from '@/components/WalletConnect';
import { VaultList } from '@/features/vaults/VaultList';
import { StreakTracker } from '@/features/streaks/StreakTracker';
import { DisciplineScore } from '@/components/DisciplineScore';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              🔐 Vaulty
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Save consistently. Grow your wealth.
            </p>
          </div>
          <WalletConnect />
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Discipline Score */}
            <DisciplineScore />
            
            {/* Vaults */}
            <VaultList />
            
            {/* Streaks */}
            <StreakTracker />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Saved</span>
                  <span className="font-semibold">$0.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Vaults</span>
                  <span className="font-semibold">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Streak</span>
                  <span className="font-semibold">0 days</span>
                </div>
              </div>
            </div>

            {/* Notifications Preview */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Notifications</h3>
              <p className="text-gray-500 text-sm">No new notifications</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
